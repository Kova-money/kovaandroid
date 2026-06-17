import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { createPublicClient, http, defineChain, formatEther, formatUnits } from "viem";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { createWalletClient, custom, parseUnits } from "viem";
import { toAccount, generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { KERNEL_V3_1, getEntryPoint } from "@zerodev/sdk/constants";
import { toPermissionValidator, serializePermissionAccount } from "@zerodev/permissions";
import { toCallPolicy, CallPolicyVersion, ParamCondition } from "@zerodev/permissions/policies";
import { toECDSASigner } from "@zerodev/permissions/signers";

import { baseSepolia } from "viem/chains";

export const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

interface ZeroDevContextType {
  address: string | null;
  balance: string | null;
  usdcBalance: string | null;
  cardLimit: string | null;
  kernelClient: any | null;
  isLoading: boolean;
  error: string | null;
  refreshBalances: () => Promise<void>;
  createVirtualCard: (limit: string) => Promise<void>;
  revokeVirtualCard: () => Promise<void>;
}

const ZeroDevContext = createContext<ZeroDevContextType>({
  address: null,
  balance: null,
  usdcBalance: null,
  cardLimit: null,
  kernelClient: null,
  isLoading: false,
  error: null,
  refreshBalances: async () => {},
  createVirtualCard: async () => {},
  revokeVirtualCard: async () => {},
});

export const useZeroDev = () => useContext(ZeroDevContext);

const ZERODEV_PROJECT_ID = import.meta.env.VITE_ZERODEV_PROJECT_ID || "de85bc35-12e0-4ad5-a122-1fe8397ead14";
const BUNDLER_URL = `https://rpc.zerodev.app/api/v3/${ZERODEV_PROJECT_ID}/chain/84532`;

export const ZeroDevProvider = ({ children }: { children: ReactNode }) => {
  const { provider, loggedIn } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [cardLimit, setCardLimit] = useState<string | null>(localStorage.getItem("cardLimit"));
  const [kernelClient, setKernelClient] = useState<any | null>(null);
  const [publicClientObj, setPublicClientObj] = useState<any | null>(null);
  const [ecdsaValidatorState, setEcdsaValidatorState] = useState<any | null>(null);
  const [kernelAccountState, setKernelAccountState] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalances = async () => {
    if (!address || !publicClientObj) return;
    try {
      const balanceWei = await publicClientObj.getBalance({ address });
      setBalance(formatEther(balanceWei));

      const usdcWei = await publicClientObj.readContract({
        address: USDC_ADDRESS,
        abi: [{
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "balance", type: "uint256" }]
        }],
        functionName: "balanceOf",
        args: [address],
      });
      setUsdcBalance(formatUnits(usdcWei as bigint, 6));
    } catch (e) {
      console.error("Failed to refresh balances", e);
    }
  };

  const createVirtualCard = async (limit: string) => {
    if (!publicClientObj || !ecdsaValidatorState || !kernelAccountState || !kernelClient) {
      throw new Error("ZeroDev not fully initialized");
    }

    // Generate local Session Key for the card
    const sessionKeyPrivateKey = generatePrivateKey();
    const sessionKeySigner = privateKeyToAccount(sessionKeyPrivateKey);
    const sessionSigner = await toECDSASigner({ signer: sessionKeySigner });

    // Restrict to USDC Transfer up to 'limit'
    const limitUnits = parseUnits(limit, 6);
    const callPolicy = toCallPolicy({
      policyVersion: CallPolicyVersion.V0_0_4,
      permissions: [{
        target: USDC_ADDRESS,
        abi: [{
          name: "transfer",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
          outputs: [{ name: "success", type: "bool" }]
        }],
        functionName: "transfer",
        args: [
          null, // any destination
          { condition: ParamCondition.LESS_THAN_OR_EQUAL, value: limitUnits }
        ]
      }]
    });

    const permissionPlugin = await toPermissionValidator(publicClientObj as any, {
      entryPoint: getEntryPoint("0.7") as any,
      kernelVersion: KERNEL_V3_1,
      signer: sessionSigner,
      policies: [callPolicy],
    });

    const sessionKeyAccount = await createKernelAccount(publicClientObj as any, {
      entryPoint: getEntryPoint("0.7") as any,
      kernelVersion: KERNEL_V3_1,
      plugins: {
        sudo: ecdsaValidatorState,
        regular: permissionPlugin,
      }
    });

    // We send a dummy transaction to self from the MAIN account just to 
    // trigger a signature prompt/tx from the main wallet, making it feel 
    // like an on-chain "Lock" transaction. 
    // In reality, session keys are installed dynamically on first use, 
    // but the user wants an explicit transaction to confirm the "Lock".
    await kernelClient.sendTransaction({
      to: kernelClient.account.address,
      value: 0n,
      data: "0x"
    });

    // Save the serialized session key and limit
    const serializedSessionKey = await serializePermissionAccount(sessionKeyAccount, sessionKeyPrivateKey);
    localStorage.setItem("virtualCard", serializedSessionKey);
    localStorage.setItem("cardLimit", limit);
    setCardLimit(limit);
    await refreshBalances();
  };

  const revokeVirtualCard = async () => {
    // Clear the virtual card session from local storage
    localStorage.removeItem("virtualCard");
    localStorage.removeItem("cardLimit");
    setCardLimit(null);
    
    // To fully reset the kernelClient back to the Root ECDSA validator instead of the session key, 
    // the simplest approach in a standard React app is to trigger a window reload.
    // This re-runs initZeroDev without the virtualCard in local storage.
    window.location.reload();
  };

  useEffect(() => {
    const initZeroDev = async () => {
      if (!loggedIn || !provider) return;
      setIsLoading(true);

      try {
        const publicClient = createPublicClient({
          transport: http(BUNDLER_URL),
          chain: baseSepolia,
        });

        const walletClient = createWalletClient({
          chain: baseSepolia,
          transport: custom(provider),
        });
        
        const [accountAddress] = await walletClient.getAddresses();
        const smartAccountSigner = toAccount({
          address: accountAddress,
          async signMessage({ message }) {
            return walletClient.signMessage({ account: accountAddress, message });
          },
          async signTransaction(transaction) {
            return walletClient.signTransaction({ account: accountAddress, ...transaction } as any);
          },
          async signTypedData(typedData) {
            return walletClient.signTypedData({ account: accountAddress, ...typedData } as any);
          }
        });

        // Create ECDSA Validator
        const ecdsaValidator = await signerToEcdsaValidator(publicClient as any, {
          signer: smartAccountSigner as any,
          entryPoint: getEntryPoint("0.7") as any,
          kernelVersion: KERNEL_V3_1,
        });

        // Import deserializePermissionAccount if not already imported at top
        const { deserializePermissionAccount } = await import("@zerodev/permissions");
        
        let account;
        const serializedVirtualCard = localStorage.getItem("virtualCard");

        if (serializedVirtualCard) {
          try {
            account = await deserializePermissionAccount(
              publicClient as any,
              getEntryPoint("0.7") as any,
              KERNEL_V3_1,
              serializedVirtualCard
            );
          } catch (err) {
            console.error("Failed to restore Virtual Card session, falling back to root account:", err);
            account = await createKernelAccount(publicClient as any, {
              plugins: { sudo: ecdsaValidator },
              entryPoint: getEntryPoint("0.7") as any,
              kernelVersion: KERNEL_V3_1,
            });
          }
        } else {
          // Create Kernel Account (Root)
          account = await createKernelAccount(publicClient as any, {
            plugins: { sudo: ecdsaValidator },
            entryPoint: getEntryPoint("0.7") as any,
            kernelVersion: KERNEL_V3_1,
          });
        }

        const zerodevPaymaster = createZeroDevPaymasterClient({
          chain: baseSepolia,
          transport: http(BUNDLER_URL),
        });

        const client = createKernelAccountClient({
          account,
          chain: baseSepolia,
          bundlerTransport: http(BUNDLER_URL),
          client: publicClient as any,
          paymaster: {
            getPaymasterData(userOperation) {
              return zerodevPaymaster.sponsorUserOperation({ userOperation });
            }
          }
        });

        // Fetch ETH balance
        const balanceWei = await publicClient.getBalance({ address: account.address });
        setBalance(formatEther(balanceWei));

        // Fetch USDC balance (Base Sepolia USDC address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e)
        try {
          const usdcWei = await publicClient.readContract({
            address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            abi: [{
              name: "balanceOf",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ name: "balance", type: "uint256" }]
            }],
            functionName: "balanceOf",
            args: [account.address],
          });
          setUsdcBalance(formatUnits(usdcWei as bigint, 6));
        } catch (e) {
          console.error("Failed to fetch USDC balance", e);
          setUsdcBalance("0.00");
        }

        setAddress(account.address);
        setKernelClient(client);
        setPublicClientObj(publicClient);
        setEcdsaValidatorState(ecdsaValidator);
        setKernelAccountState(account);
        setError(null);
      } catch (error: any) {
        console.error("ZeroDev Initialization Error:", error);
        setError(error?.message || String(error));
      } finally {
        setIsLoading(false);
      }
    };

    initZeroDev();
  }, [loggedIn, provider]);

  return (
    <ZeroDevContext.Provider value={{ 
      address, balance, usdcBalance, cardLimit, kernelClient, isLoading, error, 
      refreshBalances, createVirtualCard, revokeVirtualCard 
    }}>
      {children}
    </ZeroDevContext.Provider>
  );
};
