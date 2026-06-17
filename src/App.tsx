import React, { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useZeroDev } from './ZeroDevContext'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, ArrowDown, Repeat, Bell, ChevronLeft, MoreHorizontal, Download, Droplet, ShoppingBag, CreditCard, Home, LogOut, Copy, Check, Users, Send } from 'lucide-react'
import { encodeFunctionData, parseUnits } from 'viem'
import { USDC_ADDRESS } from './ZeroDevContext'

const ERC20_ABI = [{
  name: "transfer",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" }
  ],
  outputs: [{ name: "success", type: "bool" }]
}];

const MERCHANT_ADDRESS = "0x033D986709c6c794C42a1259A8baeb6693de9444";

const STREAM_FRIENDS = [
  { name: "Rahul", address: "0x033D986709c6c794C42a1259A8baeb6693de9444", avatar: "🧑‍💻", rate: "0.05 USDC/s" },
  { name: "Amit", address: "0xA2e6B53904dfc3A4a3d12b3e1bC1b8a1F1C6E5D4", avatar: "👨‍🎨", rate: "0.02 USDC/s" },
  { name: "Priya", address: "0xB3f7C64905eFc4B5b4E23C2cD2b9a2G2H7D6F5E5", avatar: "👩‍🔬", rate: "0.03 USDC/s" },
];

function App() {
  const { loggedIn, login, logout, isInitialized, userInfo } = useAuth();
  const { address, balance, usdcBalance, cardLimit, kernelClient, isLoading, refreshBalances, createVirtualCard, revokeVirtualCard } = useZeroDev();
  
  const [activeTab, setActiveTab] = useState('home');
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isMerchantSending, setIsMerchantSending] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Modals
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Send form
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendTxHash, setSendTxHash] = useState<string | null>(null);

  // Merchant
  const [merchantAmount, setMerchantAmount] = useState('');
  const [merchantTxHash, setMerchantTxHash] = useState<string | null>(null);
  
  // Stream State Simulation (Dripper)
  const [streamBalance, setStreamBalance] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeStreamFriend, setActiveStreamFriend] = useState<number | null>(null);
  const [isStreamSettling, setIsStreamSettling] = useState(false);

  // Card
  const [amountToLock, setAmountToLock] = useState('');
  
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isStreaming && activeStreamFriend !== null) {
      interval = setInterval(() => {
        setStreamBalance(prev => prev + 0.05);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStreaming, activeStreamFriend]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSend = async () => {
    if (!kernelClient || !sendAmount || !sendAddress) return;
    if (Number(sendAmount) > Number(usdcBalance)) {
      alert("Insufficient USDC balance!");
      return;
    }
    setIsSending(true);
    setSendTxHash(null);
    try {
      const amountUnits = parseUnits(sendAmount, 6);
      const callData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [sendAddress as `0x${string}`, amountUnits]
      });
      const hash = await kernelClient.sendTransaction({
        to: USDC_ADDRESS,
        value: 0n,
        data: callData
      });
      setSendTxHash(hash);
      setTimeout(refreshBalances, 3000);
    } catch (error) {
      console.error("Send failed:", error);
      alert("Send failed: " + (error as Error).message?.slice(0, 100));
    } finally {
      setIsSending(false);
    }
  };

  const handleLock = async () => {
    if (!kernelClient || !amountToLock) return;
    if (Number(amountToLock) > Number(usdcBalance)) {
      alert("Insufficient USDC balance to lock!");
      return;
    }
    setIsLocking(true);
    try {
      await createVirtualCard(amountToLock);
      setAmountToLock('');
      setActiveTab('home');
    } catch (error) {
      console.error("Lock failed:", error);
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlock = async () => {
    setIsUnlocking(true);
    try {
      await revokeVirtualCard();
    } catch (e) {
      console.error("Unlock failed", e);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleMerchantSpend = async () => {
    if (!kernelClient || !merchantAmount) return;
    const amt = Number(merchantAmount);
    if (amt <= 0) { alert("Enter a valid amount"); return; }
    if (amt > Number(usdcBalance)) { alert("Insufficient USDC!"); return; }

    setIsMerchantSending(true);
    setMerchantTxHash(null);
    try {
      const amountUnits = parseUnits(merchantAmount, 6);
      const callData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [MERCHANT_ADDRESS as `0x${string}`, amountUnits]
      });
      const hash = await kernelClient.sendTransaction({
        to: USDC_ADDRESS,
        value: 0n,
        data: callData
      });
      setMerchantTxHash(hash);
      setTimeout(refreshBalances, 3000);
    } catch (error) {
      console.error("Merchant spend failed:", error);
      alert("Merchant spend failed: " + (error as Error).message?.slice(0, 120));
    } finally {
      setIsMerchantSending(false);
    }
  };

  const toggleStream = async (idx: number) => {
    // If stopping an active stream, actually settle it on-chain
    if (isStreaming && activeStreamFriend === idx) {
      if (streamBalance > 0 && kernelClient) {
        setIsStreamSettling(true);
        try {
          const amountUnits = parseUnits(streamBalance.toFixed(6), 6);
          const friendAddress = STREAM_FRIENDS[idx].address;
          const callData = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [friendAddress as `0x${string}`, amountUnits]
          });
          await kernelClient.sendTransaction({
            to: USDC_ADDRESS,
            value: 0n,
            data: callData
          });
          alert(`Success! Settled ${streamBalance.toFixed(2)} USDC on-chain to ${STREAM_FRIENDS[idx].name}`);
          setTimeout(refreshBalances, 3000);
        } catch (e) {
          console.error("Stream settlement failed:", e);
          alert("Stream settlement failed. Insufficient gas or USDC balance.");
        } finally {
          setIsStreamSettling(false);
        }
      }
      setIsStreaming(false);
      setActiveStreamFriend(null);
      setStreamBalance(0);
    } else {
      // Start a new stream
      setActiveStreamFriend(idx);
      setStreamBalance(0);
      setIsStreaming(true);
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans text-foreground">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-10 rounded-[2.5rem] bg-card shadow-sm w-full max-w-sm text-center"
        >
          <div className="w-20 h-20 bg-primary/20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Kova Money</h1>
          <p className="text-muted-foreground mb-10 text-sm">Self-custodial stablecoin spending powered by ZeroDev.</p>
          <button 
            onClick={login}
            disabled={!isInitialized}
            className={`w-full font-bold py-4 rounded-full transition-all ${
              isInitialized ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-xl shadow-primary/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isInitialized ? 'Login with Passkey' : 'Initializing...'}
          </button>
        </motion.div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch(activeTab) {
      case 'home':
        return (
          <motion.div key="home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="pb-32">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 px-6 pt-8">
              <div>
                <h1 className="text-2xl font-bold">Hey, {userInfo?.name?.split(' ')[0] || 'User'}!</h1>
                <p className="text-sm text-muted-foreground">Good morning! 👋</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center overflow-hidden relative">
                {userInfo?.profileImage ? (
                  <img src={userInfo.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Bell className="w-5 h-5 text-gray-500" />
                )}
                <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
              </div>
            </div>

            {/* Current Value */}
            <div className="px-6 mb-8">
              <p className="text-sm text-muted-foreground mb-2">Available USDC Balance</p>
              <div className="flex items-baseline gap-3">
                <h2 className="text-[2.75rem] font-bold tracking-tight">${usdcBalance ? Number(usdcBalance).toFixed(2) : "0.00"}</h2>
                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full mb-3">Base Sepolia</span>
              </div>
            </div>

            {/* Transfer/Receive Pill Bar — NOW FUNCTIONAL */}
            <div className="px-6 mb-10 relative">
              <div className="bg-white border border-gray-100 rounded-full p-2 flex justify-between items-center shadow-sm relative z-10 h-16">
                <button onClick={() => setShowSendModal(true)} className="flex-1 flex justify-center items-center gap-2 font-semibold text-sm h-full rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
                    <ArrowUp className="w-4 h-4" />
                  </div>
                  Transfer
                </button>
                <button onClick={() => setShowReceiveModal(true)} className="flex-1 flex justify-center items-center gap-2 font-semibold text-sm h-full rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors">
                  Receive
                  <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                </button>
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100 z-20 cursor-pointer hover:bg-gray-50 transition-colors">
                <Repeat className="w-5 h-5" />
              </div>
            </div>

            {/* Assets */}
            <div className="px-6 space-y-4">
              <div className="bg-secondary text-secondary-foreground rounded-[2rem] p-5 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Card Limit</h3>
                    <p className="text-xs text-white/50">Virtual Card Session</p>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-lg">${cardLimit ? Number(cardLimit).toFixed(2) : "0.00"}</h3>
                  <button onClick={handleUnlock} disabled={!cardLimit || isUnlocking} className="text-xs text-orange-300 hover:text-orange-200 mt-1 disabled:opacity-30">
                    {isUnlocking ? 'Revoking...' : 'Revoke'}
                  </button>
                </div>
              </div>

              <div className="bg-secondary text-secondary-foreground rounded-[2rem] p-5 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <Droplet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">ETH Gas</h3>
                    <p className="text-xs text-white/50">Base Sepolia</p>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-lg">{balance ? Number(balance).toFixed(4) : "0.0000"}</h3>
                  <p className="text-xs text-green-400 mt-1">Sponsored</p>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'card':
        return (
          <motion.div key="card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="min-h-screen bg-secondary pb-32 pt-8 px-6 text-white">
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setActiveTab('home')} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold">Virtual Card</h1>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-mono">
                {address?.slice(0,6)}...{address?.slice(-4)}
              </div>
            </div>

            {/* Card Visual */}
            <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 rounded-[2rem] p-6 mb-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 opacity-10">
                <CreditCard className="w-40 h-40" />
              </div>
              <div className="relative z-10">
                <p className="text-white/60 text-xs mb-1">KOVA VIRTUAL CARD</p>
                <h2 className="text-3xl font-bold mb-6">${cardLimit ? Number(cardLimit).toFixed(2) : "0.00"} <span className="text-sm font-normal text-white/60">USDC</span></h2>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-white/50 text-[10px]">CARD HOLDER</p>
                    <p className="text-sm font-mono">{address?.slice(0,6)}...{address?.slice(-4)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-[10px]">STATUS</p>
                    <p className="text-sm font-bold">{cardLimit ? '🟢 Active' : '⚪ Inactive'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lock Form */}
            <div className="bg-white rounded-[2.5rem] p-6 text-black mb-6">
              <div className="flex justify-between mb-4">
                <p className="font-bold">Set Card Limit</p>
                <p className="text-sm text-gray-500">Bal: {usdcBalance} USDC</p>
              </div>
              
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl mb-4">
                <div className="flex items-center gap-2 font-bold text-lg">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">$</div>
                  USDC
                </div>
                <input 
                  type="number" 
                  value={amountToLock}
                  onChange={(e) => setAmountToLock(e.target.value)}
                  placeholder="0.00"
                  className="text-right text-2xl font-bold bg-transparent outline-none w-1/2"
                />
              </div>

              <div className="flex gap-2 mb-4">
                <button onClick={() => setAmountToLock((Number(usdcBalance)/4).toFixed(2))} className="px-4 py-1.5 bg-gray-100 font-semibold text-xs rounded-full hover:bg-gray-200">25%</button>
                <button onClick={() => setAmountToLock((Number(usdcBalance)/2).toFixed(2))} className="px-4 py-1.5 bg-gray-100 font-semibold text-xs rounded-full hover:bg-gray-200">Half</button>
                <button onClick={() => setAmountToLock(usdcBalance || '0')} className="px-4 py-1.5 bg-primary/40 font-semibold text-xs rounded-full hover:bg-primary/60">Max</button>
              </div>

              <button 
                onClick={handleLock}
                disabled={isLocking || !amountToLock}
                className="w-full bg-black text-white font-bold py-4 rounded-full hover:bg-gray-900 disabled:opacity-50 transition-all"
              >
                {isLocking ? '⏳ Creating Session...' : '🔒 Lock & Create Card'}
              </button>
            </div>

            {cardLimit && (
              <button 
                onClick={handleUnlock}
                disabled={isUnlocking}
                className="w-full border-2 border-red-400/50 text-red-300 font-bold py-4 rounded-full hover:bg-red-500/10 disabled:opacity-50"
              >
                {isUnlocking ? 'Revoking...' : '🔓 Revoke Card Session'}
              </button>
            )}
          </motion.div>
        );

      case 'dripper':
        return (
          <motion.div key="dripper" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="pb-32 pt-8 px-6">
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setActiveTab('home')} className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold">Kova Streams</h1>
              <div className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center">
                <MoreHorizontal className="w-5 h-5" />
              </div>
            </div>

            {/* Stream Balance */}
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground mb-2">Streaming Balance</p>
              <h2 className="text-5xl font-bold mb-2">{streamBalance.toFixed(3)} <span className="text-xl text-muted-foreground">USDC</span></h2>
              {isStreaming && activeStreamFriend !== null && (
                <p className="text-xs text-green-600 bg-green-50 inline-block px-3 py-1 rounded-full">🟢 Streaming to {STREAM_FRIENDS[activeStreamFriend].name}</p>
              )}
            </div>

            {/* Progress */}
            <div className="bg-secondary text-secondary-foreground rounded-[2rem] p-5 mb-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <p className="font-bold text-sm">Stream Progress</p>
                <p className="text-xs text-white/50">Auto-collateralizing</p>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 mb-4 overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{width: `${Math.min((streamBalance / 100) * 100, 100)}%`}}></div>
              </div>
              <div className="flex justify-between text-xs text-white/50">
                <span>+{streamBalance.toFixed(2)} accrued</span>
                <span>100 USDC goal</span>
              </div>
            </div>

            {/* Friends List */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-bold">Stream Recipients</h3>
              </div>
              <div className="space-y-3">
                {STREAM_FRIENDS.map((friend, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                        {friend.avatar}
                      </div>
                      <div>
                        <p className="font-bold">{friend.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{friend.address.slice(0,8)}...{friend.address.slice(-4)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleStream(idx)}
                      disabled={isStreamSettling && activeStreamFriend === idx}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        isStreaming && activeStreamFriend === idx 
                          ? 'bg-red-50 text-red-600 border border-red-200' 
                          : 'bg-primary/30 text-primary-foreground border border-primary/20'
                      }`}
                    >
                      {isStreamSettling && activeStreamFriend === idx ? '⏳ Settling...' : (isStreaming && activeStreamFriend === idx ? '⏸ Pause' : '▶ Stream')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
        
      case 'merchant':
        return (
          <motion.div key="merchant" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="pb-32 pt-8 px-6">
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setActiveTab('home')} className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold">Merchant Spend</h1>
              <div className="w-10"></div>
            </div>
            
            {/* Merchant Info */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-[2rem] p-6 text-center mb-6">
              <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold mb-1">Pay Merchant</h2>
              <p className="text-xs text-gray-500 font-mono bg-white/80 inline-block px-3 py-1 rounded-full">{MERCHANT_ADDRESS.slice(0,10)}...{MERCHANT_ADDRESS.slice(-6)}</p>
            </div>

            {/* Spend Form */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm mb-6">
              <p className="font-bold mb-1">Amount to Pay</p>
              <p className="text-xs text-gray-400 mb-4">Available: {usdcBalance || "0.00"} USDC • Card Limit: {cardLimit || "0.00"} USDC</p>
              
              <div className="flex items-center bg-gray-50 p-4 rounded-2xl mb-4">
                <div className="flex items-center gap-2 font-bold text-lg mr-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">$</div>
                </div>
                <input 
                  type="number" 
                  value={merchantAmount}
                  onChange={(e) => setMerchantAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 text-2xl font-bold bg-transparent outline-none"
                />
                <span className="text-gray-400 font-bold">USDC</span>
              </div>

              <div className="flex gap-2 mb-6">
                <button onClick={() => setMerchantAmount('1')} className="px-4 py-1.5 bg-gray-100 font-semibold text-xs rounded-full hover:bg-gray-200">$1</button>
                <button onClick={() => setMerchantAmount('5')} className="px-4 py-1.5 bg-gray-100 font-semibold text-xs rounded-full hover:bg-gray-200">$5</button>
                <button onClick={() => setMerchantAmount('10')} className="px-4 py-1.5 bg-gray-100 font-semibold text-xs rounded-full hover:bg-gray-200">$10</button>
                <button onClick={() => setMerchantAmount('25')} className="px-4 py-1.5 bg-gray-100 font-semibold text-xs rounded-full hover:bg-gray-200">$25</button>
              </div>

              {merchantTxHash && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
                  <p className="text-xs text-green-700 text-center font-bold">
                    ✅ Payment Successful!<br/>
                    <a href={`https://sepolia.basescan.org/tx/${merchantTxHash}`} target="_blank" rel="noreferrer" className="underline font-normal">View on Explorer →</a>
                  </p>
                </div>
              )}

              <button 
                onClick={handleMerchantSpend}
                disabled={isMerchantSending || !merchantAmount}
                className="w-full bg-secondary text-white font-bold py-4 rounded-full shadow-lg hover:bg-black/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isMerchantSending ? '⏳ Processing...' : (
                  <>
                    <Send className="w-5 h-5" />
                    Pay ${merchantAmount || '0.00'} USDC
                  </>
                )}
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans relative overflow-x-hidden">
      <AnimatePresence mode="wait">
        {renderTabContent()}
      </AnimatePresence>

      {/* ======= SEND MODAL ======= */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Send USDC</h3>
              <button onClick={() => { setShowSendModal(false); setSendTxHash(null); setSendAmount(''); setSendAddress(''); }} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">Recipient Address</label>
                <input 
                  type="text" value={sendAddress} onChange={(e) => setSendAddress(e.target.value)}
                  placeholder="0x..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-primary font-mono text-sm" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">Amount</label>
                <div className="relative">
                  <input 
                    type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="0.00" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-primary text-xl font-bold" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">USDC</span>
                </div>
              </div>
              
              {sendTxHash && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs text-green-700 text-center">
                    ✅ Sent! <a href={`https://sepolia.basescan.org/tx/${sendTxHash}`} target="_blank" rel="noreferrer" className="underline">View on Explorer</a>
                  </p>
                </div>
              )}

              <button 
                onClick={handleSend}
                disabled={isSending || !sendAmount || !sendAddress}
                className="w-full bg-black text-white font-bold py-3.5 rounded-full disabled:opacity-50 transition-all"
              >
                {isSending ? '⏳ Sending...' : 'Send Now'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ======= RECEIVE MODAL ======= */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl text-center"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Receive Funds</h3>
              <button onClick={() => setShowReceiveModal(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
            </div>

            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowDown className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-sm text-gray-500 mb-6">Send Base Sepolia ETH or USDC to this address.</p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-mono break-all text-gray-800 mb-3">
                {isLoading ? "Loading..." : address || "Connect to create address"}
              </p>
              <button 
                onClick={copyAddress}
                className="text-xs flex items-center gap-1 justify-center mx-auto text-gray-500 hover:text-black transition-colors bg-white px-3 py-1.5 rounded-full border border-gray-200"
              >
                {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Address</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ======= BOTTOM NAV ======= */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm">
        <div className="bg-secondary text-secondary-foreground rounded-[2rem] p-2 flex justify-between items-center shadow-2xl border border-white/10 relative">
          <div className="flex-1 flex justify-evenly">
            <button onClick={() => setActiveTab('dripper')} className={`p-3 rounded-full transition-colors ${activeTab === 'dripper' ? 'text-primary' : 'text-white/50 hover:text-white'}`}>
              <Droplet className="w-6 h-6" />
            </button>
            <button onClick={() => setActiveTab('merchant')} className={`p-3 rounded-full transition-colors ${activeTab === 'merchant' ? 'text-primary' : 'text-white/50 hover:text-white'}`}>
              <ShoppingBag className="w-6 h-6" />
            </button>
          </div>
          <div className="w-20"></div>
          <div className="flex-1 flex justify-evenly">
            <button onClick={() => setActiveTab('card')} className={`p-3 rounded-full transition-colors ${activeTab === 'card' ? 'text-primary' : 'text-white/50 hover:text-white'}`}>
              <CreditCard className="w-6 h-6" />
            </button>
            <button onClick={logout} className="p-3 rounded-full text-white/50 hover:text-red-400 transition-colors">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
          <button 
            onClick={() => setActiveTab('home')}
            className={`absolute left-1/2 -top-6 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-background flex items-center justify-center shadow-xl transition-colors ${activeTab === 'home' ? 'bg-primary text-primary-foreground' : 'bg-white text-black'}`}
          >
            <Home className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
