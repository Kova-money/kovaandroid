import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useZeroDev } from './ZeroDevContext'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowUp, ArrowDown, Repeat, Bell, ChevronLeft, MoreHorizontal, 
  Droplet, ShoppingBag, CreditCard, Home, LogOut, Copy, Check, 
  Users, Send, Eye, EyeOff, Wifi, Signal, Battery, HelpCircle, 
  Shield, Cpu, RefreshCw
} from 'lucide-react'
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

const Keypad = ({ onKeyPress }: { onKeyPress: (key: string) => void }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
  return (
    <div className="grid grid-cols-3 gap-y-4 gap-x-12 w-full max-w-[260px] mx-auto mt-4 mb-2">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => onKeyPress(key)}
          className="h-12 w-full flex items-center justify-center text-xl font-medium transition-all text-white active:scale-90 active:text-primary rounded-full hover:bg-white/5 cursor-pointer"
        >
          {key}
        </button>
      ))}
    </div>
  );
};

const Sparkline = () => (
  <svg className="w-full h-24 stroke-[2.5] stroke-primary fill-none overflow-visible my-3" viewBox="0 0 100 30">
    <defs>
      <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c3f53b" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#c3f53b" stopOpacity="0.0" />
      </linearGradient>
    </defs>
    <path
      d="M0,22 Q15,8 30,20 T60,4 T80,16 T100,6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="stroke-primary"
      style={{ filter: 'drop-shadow(0px 4px 8px rgba(195,245,59,0.3))' }}
    />
    <path
      d="M0,22 Q15,8 30,20 T60,4 T80,16 T100,6 L100,30 L0,30 Z"
      fill="url(#chart-glow)"
    />
  </svg>
);

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
  
  // Custom states
  const [showBalance, setShowBalance] = useState(true);
  const [timeString, setTimeString] = useState('12:59');
  const [txHistory, setTxHistory] = useState([
    { id: 1, type: 'Sent', target: 'Rahul', amount: '12.50', status: 'Success', date: 'Today, 11:24 AM' },
    { id: 2, type: 'Received', target: 'Circle Faucet', amount: '50.00', status: 'Success', date: 'Yesterday, 04:12 PM' },
    { id: 3, type: 'Payment', target: 'Dev Merchant', amount: '8.99', status: 'Success', date: 'Jun 17, 02:40 PM' }
  ]);

  // Card 3D Tilt rotation state
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateX(-y / 8);
    setRotateY(x / 8);
  };

  const handleCardMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

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
      
      // Add transaction to history
      setTxHistory(prev => [
        { id: Date.now(), type: 'Sent', target: sendAddress.slice(0, 8) + '...', amount: sendAmount, status: 'Success', date: 'Just now' },
        ...prev
      ]);
      
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
      
      // Add to transaction history
      setTxHistory(prev => [
        { id: Date.now(), type: 'Payment', target: 'Dev Merchant', amount: merchantAmount, status: 'Success', date: 'Just now' },
        ...prev
      ]);

      setTimeout(refreshBalances, 3000);
    } catch (error) {
      console.error("Merchant spend failed:", error);
      alert("Merchant spend failed: " + (error as Error).message?.slice(0, 120));
    } finally {
      setIsMerchantSending(false);
    }
  };

  const toggleStream = async (idx: number) => {
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
          
          setTxHistory(prev => [
            { id: Date.now(), type: 'Stream Settle', target: STREAM_FRIENDS[idx].name, amount: streamBalance.toFixed(2), status: 'Success', date: 'Just now' },
            ...prev
          ]);
          
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
      setActiveStreamFriend(idx);
      setStreamBalance(0);
      setIsStreaming(true);
    }
  };

  // Custom keypress handler for amountToLock Keypad
  const handleLockKeypress = (key: string) => {
    if (key === '⌫') {
      setAmountToLock(prev => prev.slice(0, -1));
    } else if (key === '.') {
      if (!amountToLock.includes('.')) {
        setAmountToLock(prev => prev + '.');
      }
    } else {
      if (amountToLock.includes('.')) {
        const [, decimal] = amountToLock.split('.');
        if (decimal && decimal.length >= 2) return;
      }
      setAmountToLock(prev => prev + key);
    }
  };

  // Custom keypress handler for merchantAmount Keypad
  const handleMerchantKeypress = (key: string) => {
    if (key === '⌫') {
      setMerchantAmount(prev => prev.slice(0, -1));
    } else if (key === '.') {
      if (!merchantAmount.includes('.')) {
        setMerchantAmount(prev => prev + '.');
      }
    } else {
      if (merchantAmount.includes('.')) {
        const [, decimal] = merchantAmount.split('.');
        if (decimal && decimal.length >= 2) return;
      }
      setMerchantAmount(prev => prev + key);
    }
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'home':
        return (
          <motion.div 
            key="home" 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            transition={{ duration: 0.2 }}
            className="pb-28"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center overflow-hidden bg-white/5">
                  {userInfo?.profileImage ? (
                    <img src={userInfo.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">👤</span>
                  )}
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-white/90">Hello, {userInfo?.name?.split(' ')[0] || 'User'}</h1>
                  <p className="text-[10px] text-white/40">Welcome back 👋</p>
                </div>
              </div>
              <button className="w-10 h-10 rounded-full border border-white/5 bg-white/5 flex items-center justify-center relative hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
                <Bell className="w-4 h-4 text-white/80" />
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary rounded-full"></span>
              </button>
            </div>

            {/* Total Balance Panel */}
            <div className="mb-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-white/40 text-xs mb-1">
                <span>Total balance</span>
                <button onClick={() => setShowBalance(!showBalance)} className="hover:text-white cursor-pointer transition-colors">
                  {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
              
              <div className="flex items-baseline justify-center gap-2 mb-1">
                <h2 className="text-4xl font-extrabold tracking-tight text-white">
                  {showBalance ? `$${usdcBalance ? Number(usdcBalance).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : "0.00"}` : "$ ••••"}
                </h2>
                <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">USDC</span>
              </div>
              <p className="text-[10px] text-white/40 font-mono">~{(Number(usdcBalance) / 3800).toFixed(4)} ETH <span className="text-primary font-bold ml-1">+3.56%</span></p>
            </div>

            {/* Sparkline / Chart */}
            <div className="glass-panel rounded-3xl p-2 mb-6">
              <Sparkline />
              <div className="flex justify-between px-4 pb-2 text-[9px] text-white/30 font-semibold uppercase tracking-wider">
                <span className="text-primary">1h</span>
                <span className="bg-white/10 text-white px-2 py-0.5 rounded-md">1d</span>
                <span>1w</span>
                <span>1m</span>
                <span>3m</span>
                <span>all</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <button 
                onClick={() => setShowSendModal(true)} 
                className="flex flex-col items-center gap-2 text-[10px] font-medium text-white/70 hover:text-white transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 active:scale-95 transition-all">
                  <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                </div>
                Send
              </button>
              <button 
                onClick={() => setShowReceiveModal(true)} 
                className="flex flex-col items-center gap-2 text-[10px] font-medium text-white/70 hover:text-white transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 active:scale-95 transition-all">
                  <ArrowDown className="w-5 h-5 stroke-[2.5]" />
                </div>
                Receive
              </button>
              <button 
                onClick={() => setActiveTab('dripper')} 
                className="flex flex-col items-center gap-2 text-[10px] font-medium text-white/70 hover:text-white transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 active:scale-95 transition-all">
                  <Repeat className="w-5 h-5 stroke-[2.5]" />
                </div>
                Stream
              </button>
              <button 
                onClick={() => setActiveTab('merchant')} 
                className="flex flex-col items-center gap-2 text-[10px] font-medium text-white/70 hover:text-white transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 active:scale-95 transition-all">
                  <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                </div>
                Pay Direct
              </button>
            </div>

            {/* Smart Widgets Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div 
                onClick={() => setActiveTab('card')}
                className="glass-panel rounded-2xl p-4 flex flex-col justify-between h-28 hover:bg-white/[0.05] transition-all cursor-pointer border border-white/5 relative group"
              >
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${cardLimit ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/10 text-white/50'}`}>
                    {cardLimit ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-white/40">Virtual Card Limit</p>
                  <h3 className="text-base font-bold text-white">${cardLimit ? Number(cardLimit).toFixed(2) : "0.00"}</h3>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between h-28 border border-white/5 relative">
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Droplet className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25">Sponsored</span>
                </div>
                <div>
                  <p className="text-[10px] text-white/40">ETH Gas Sponsored</p>
                  <h3 className="text-base font-bold text-white">{balance ? Number(balance).toFixed(4) : "0.0000"} <span className="text-xs text-white/40">ETH</span></h3>
                </div>
              </div>
            </div>

            {/* Transactions Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-white/80 tracking-wide uppercase">Transactions</h3>
                <button className="text-[10px] font-bold text-primary hover:underline cursor-pointer">See All</button>
              </div>
              <div className="space-y-2">
                {txHistory.map((tx) => (
                  <div key={tx.id} className="glass-panel rounded-xl p-3 flex items-center justify-between border border-white/5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        {tx.type === 'Received' ? (
                          <ArrowDown className="w-4 h-4 text-green-400" />
                        ) : tx.type === 'Stream Settle' ? (
                          <Droplet className="w-4 h-4 text-primary" />
                        ) : (
                          <ArrowUp className="w-4 h-4 text-white/80" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{tx.type} {tx.type !== 'Payment' && tx.type !== 'Received' ? 'to' : 'from'} {tx.target}</p>
                        <p className="text-[9px] text-white/40">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${tx.type === 'Received' ? 'text-green-400' : 'text-white'}`}>
                        {tx.type === 'Received' ? '+' : '-'}{tx.amount} USDC
                      </p>
                      <p className="text-[8px] font-bold text-primary">Gas Free</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case 'card':
        return (
          <motion.div 
            key="card" 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            transition={{ duration: 0.2 }}
            className="pb-28"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pt-4">
              <button onClick={() => setActiveTab('home')} className="w-9 h-9 rounded-full border border-white/5 bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-sm font-bold text-white/90">Virtual Card</h1>
              <div className="w-9 h-9 rounded-full border border-white/5 bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
                <HelpCircle className="w-4 h-4 text-white/50" />
              </div>
            </div>

            {/* Virtual Card Rendering */}
            <div className="perspective-[1000px] mb-6">
              <motion.div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                animate={{ rotateX, rotateY }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                style={{ transformStyle: "preserve-3d" }}
                className="w-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-white/15 rounded-[2rem] p-6 relative overflow-hidden shadow-2xl h-48 select-none"
              >
                {/* Shine Backdrop effect */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--x,50%)_var(--y,50%),rgba(255,255,255,0.08)_0%,transparent_50%)] pointer-events-none" />
                <div className="absolute top-[-40%] right-[-20%] w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex justify-between items-start h-full flex-col relative z-10">
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <p className="text-[9px] font-bold text-white/40 tracking-widest uppercase">Kova Pay</p>
                      <p className="text-[7px] text-primary/80 font-mono tracking-wider">Session Key Secured</p>
                    </div>
                    <div className="w-7 h-5 bg-white/10 rounded border border-white/10 flex items-center justify-center">
                      <Cpu className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </div>

                  <div className="w-full">
                    <p className="text-[10px] text-white/30 tracking-widest mb-1">CARD LIMIT</p>
                    <h2 className="text-2xl font-bold tracking-tight text-white">${cardLimit ? Number(cardLimit).toFixed(2) : "0.00"} <span className="text-[10px] text-primary font-bold">USDC</span></h2>
                  </div>

                  <div className="flex justify-between items-end w-full">
                    <div>
                      <p className="text-[7px] text-white/30 uppercase tracking-widest">Smart Address</p>
                      <p className="text-[10px] font-mono text-white/70">{address ? `${address.slice(0, 6)} •••• ${address.slice(-4)}` : "Not Initialized"}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${cardLimit ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/10 text-white/40'}`}>
                        {cardLimit ? '🟢 ACTIVE' : '⚪ INACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Set limit card */}
            <div className="glass-panel rounded-[2rem] p-5 border border-white/5 mb-4">
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-xs font-bold text-white/80">Set Card Limit</span>
                <span className="text-[10px] text-white/40">Available: {usdcBalance || "0.00"} USDC</span>
              </div>

              {/* Amount View */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-primary">USDC</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">
                    ${amountToLock || "0.00"}
                  </div>
                </div>
              </div>

              {/* Fast selector options */}
              <div className="flex gap-2 justify-center mb-2">
                <button 
                  onClick={() => setAmountToLock((Number(usdcBalance) * 0.25).toFixed(2))}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 text-[10px] font-bold rounded-full text-white/80 transition-all cursor-pointer"
                >
                  25%
                </button>
                <button 
                  onClick={() => setAmountToLock((Number(usdcBalance) * 0.50).toFixed(2))}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 text-[10px] font-bold rounded-full text-white/80 transition-all cursor-pointer"
                >
                  50%
                </button>
                <button 
                  onClick={() => setAmountToLock(usdcBalance || '0')}
                  className="px-4 py-1.5 bg-primary/20 border border-primary/20 hover:bg-primary/30 active:scale-95 text-[10px] font-bold rounded-full text-primary transition-all cursor-pointer"
                >
                  Max
                </button>
              </div>

              {/* Keypad */}
              <Keypad onKeyPress={handleLockKeypress} />

              {/* Action Button */}
              <button
                onClick={handleLock}
                disabled={isLocking || !amountToLock || Number(amountToLock) <= 0}
                className="w-full bg-primary hover:opacity-90 active:scale-98 text-black font-extrabold py-3.5 rounded-2xl shadow-lg shadow-primary/10 transition-all disabled:opacity-40 text-xs mt-4 cursor-pointer"
              >
                {isLocking ? '⏳ Spawning Session Card...' : '🔒 Lock Limit & Spawn'}
              </button>
            </div>

            {cardLimit && (
              <button
                onClick={handleUnlock}
                disabled={isUnlocking}
                className="w-full border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 active:scale-98 text-red-400 font-bold py-3.5 rounded-2xl transition-all disabled:opacity-40 text-xs cursor-pointer"
              >
                {isUnlocking ? 'Revoking...' : '🔓 Revoke Card Session'}
              </button>
            )}
          </motion.div>
        );

      case 'dripper':
        return (
          <motion.div 
            key="dripper" 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            transition={{ duration: 0.2 }}
            className="pb-28"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pt-4">
              <button onClick={() => setActiveTab('home')} className="w-9 h-9 rounded-full border border-white/5 bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-sm font-bold text-white/90">Kova Streams</h1>
              <div className="w-9 h-9 rounded-full border border-white/5 bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
                <MoreHorizontal className="w-4 h-4 text-white/50" />
              </div>
            </div>

            {/* Stream Counter Bubble */}
            <div className="glass-panel rounded-[2rem] p-6 text-center border border-white/5 mb-6 relative overflow-hidden flex flex-col items-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(195,245,59,0.08)_0%,transparent_60%)] pointer-events-none" />
              <p className="text-[10px] text-white/40 tracking-wider mb-2">STREAMING BALANCE</p>
              
              <div className="relative mb-2">
                <div className={`w-28 h-28 rounded-full border border-primary/20 flex flex-col items-center justify-center bg-primary/5 transition-all duration-1000 ${isStreaming ? 'animate-pulse scale-105' : ''}`}>
                  <Droplet className={`w-8 h-8 text-primary mb-1 ${isStreaming ? 'animate-bounce' : ''}`} />
                  <span className="text-lg font-bold text-white">{streamBalance.toFixed(2)}</span>
                  <span className="text-[8px] text-white/40 uppercase">USDC</span>
                </div>
                {isStreaming && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                )}
              </div>

              {isStreaming && activeStreamFriend !== null && (
                <p className="text-[9px] text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full font-bold">
                  🟢 Sending real-time to {STREAM_FRIENDS[activeStreamFriend].name}
                </p>
              )}
            </div>

            {/* Progress and Collateral */}
            <div className="glass-panel rounded-2xl p-4 border border-white/5 mb-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-bold text-white/70">Stream Progress</p>
                <p className="text-[8px] text-white/40">Autocollateralizing</p>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min((streamBalance / 25) * 100, 100)}%` }} 
                />
              </div>
              <div className="flex justify-between text-[8px] text-white/30 mt-2 font-mono">
                <span>+{streamBalance.toFixed(2)} accrued</span>
                <span>25 USDC Max cap</span>
              </div>
            </div>

            {/* Friends list */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Users className="w-3.5 h-3.5 text-white/40" />
                <h3 className="text-xs font-bold text-white/80 uppercase tracking-wide">Recipients</h3>
              </div>
              <div className="space-y-2">
                {STREAM_FRIENDS.map((friend, idx) => (
                  <div key={idx} className="glass-panel rounded-2xl p-4 flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-xl border border-white/5">
                        {friend.avatar}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{friend.name}</p>
                        <p className="text-[9px] text-white/40 font-mono">{friend.address.slice(0, 6)}...{friend.address.slice(-4)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleStream(idx)}
                      disabled={isStreamSettling && activeStreamFriend === idx}
                      className={`px-4 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${
                        isStreaming && activeStreamFriend === idx 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-primary text-black hover:opacity-90 shadow-md'
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
          <motion.div 
            key="merchant" 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            transition={{ duration: 0.2 }}
            className="pb-28"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pt-4">
              <button onClick={() => setActiveTab('home')} className="w-9 h-9 rounded-full border border-white/5 bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-sm font-bold text-white/90">Merchant Checkout</h1>
              <div className="w-9 h-9 rounded-full border border-white/5 bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
                <ShoppingBag className="w-4 h-4 text-white/50" />
              </div>
            </div>

            {/* Merchant Details panel */}
            <div className="glass-panel rounded-[2rem] p-5 border border-white/5 mb-4 text-center relative overflow-hidden">
              <div className="absolute top-[-30%] left-[-20%] w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <div className="w-12 h-12 bg-primary text-black rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/10">
                <ShoppingBag className="w-6 h-6 stroke-[2]" />
              </div>
              <h2 className="text-sm font-bold text-white">Dev Merchant Store</h2>
              <p className="text-[8px] text-white/40 font-mono mt-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded-full inline-block">
                {MERCHANT_ADDRESS.slice(0, 10)}...{MERCHANT_ADDRESS.slice(-6)}
              </p>
            </div>

            {/* Pay form */}
            <div className="glass-panel rounded-[2rem] p-5 border border-white/5 mb-4">
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-xs font-bold text-white/80">Payment Amount</span>
                <span className="text-[10px] text-white/40">Bal: {usdcBalance || "0.00"} USDC</span>
              </div>

              {/* Amount display */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-primary">USDC</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">
                    ${merchantAmount || "0.00"}
                  </div>
                </div>
              </div>

              {/* Quick option pills */}
              <div className="flex gap-2 justify-center mb-2">
                <button 
                  onClick={() => setMerchantAmount('1')} 
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 text-[10px] font-bold rounded-full text-white/80 transition-all cursor-pointer"
                >
                  $1
                </button>
                <button 
                  onClick={() => setMerchantAmount('5')} 
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 text-[10px] font-bold rounded-full text-white/80 transition-all cursor-pointer"
                >
                  $5
                </button>
                <button 
                  onClick={() => setMerchantAmount('10')} 
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 text-[10px] font-bold rounded-full text-white/80 transition-all cursor-pointer"
                >
                  $10
                </button>
                <button 
                  onClick={() => setMerchantAmount('25')} 
                  className="px-4 py-1.5 bg-primary/20 border border-primary/20 hover:bg-primary/30 active:scale-95 text-[10px] font-bold rounded-full text-primary transition-all cursor-pointer"
                >
                  $25
                </button>
              </div>

              {/* Keypad */}
              <Keypad onKeyPress={handleMerchantKeypress} />

              {/* Transaction success overlay */}
              {merchantTxHash && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl mb-4 text-center mt-4">
                  <p className="text-[10px] text-green-400 font-bold">
                    ✅ Payment Successful!
                  </p>
                  <a 
                    href={`https://sepolia.basescan.org/tx/${merchantTxHash}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[9px] text-primary underline font-medium block mt-1"
                  >
                    View transaction on Explorer →
                  </a>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleMerchantSpend}
                disabled={isMerchantSending || !merchantAmount || Number(merchantAmount) <= 0}
                className="w-full bg-primary hover:opacity-90 active:scale-98 text-black font-extrabold py-3.5 rounded-2xl shadow-lg shadow-primary/10 transition-all disabled:opacity-40 text-xs mt-4 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isMerchantSending ? '⏳ Processing payment...' : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Confirm & Pay ${merchantAmount || '0.00'} USDC
                  </>
                )}
              </button>
            </div>
          </motion.div>
        );
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#07080c] flex items-center justify-center p-0 sm:p-6 select-none relative overflow-hidden font-sans text-white">
        {/* Glow Spheres */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#c3f53b]/10 rounded-full filter blur-[130px] pointer-events-none animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#5d8000]/10 rounded-full filter blur-[130px] pointer-events-none animate-pulse-glow" />

        {/* Bezel Frame Container */}
        <div className="w-full h-full min-h-screen sm:w-[390px] sm:h-[844px] sm:rounded-[55px] sm:border-[12px] sm:border-black sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col justify-between bg-[#0b0c10]/95 backdrop-blur-3xl">
          {/* Status Bar */}
          <div className="h-12 w-full flex justify-between items-center px-6 relative select-none">
            <span className="text-[11px] font-bold text-white/90">{timeString}</span>
            <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-3 w-28 h-6 bg-black rounded-full z-50" />
            <div className="flex items-center gap-1.5 text-white/90">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Onboarding Main Content */}
          <div className="flex-grow flex flex-col items-center justify-center px-6 py-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full text-center"
            >
              {/* Glowing Mint Green Logo */}
              <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-primary to-green-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/10 relative">
                <div className="absolute inset-[1px] bg-neutral-900 rounded-[1.2rem] flex items-center justify-center">
                  <CreditCard className="w-7 h-7 text-primary" />
                </div>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Kova Money</h1>
              <p className="text-white/40 text-xs max-w-[240px] mx-auto mb-12 leading-relaxed">
                Self-custodial stablecoin spending powered by ZeroDev Account Abstraction.
              </p>

              {/* Login Action Card */}
              <div className="glass-panel rounded-[2rem] p-6 border border-white/5 relative overflow-hidden">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-4">Authorized Login</h3>
                
                <button 
                  onClick={login}
                  disabled={!isInitialized}
                  className={`w-full py-3.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isInitialized 
                      ? 'bg-primary text-black hover:opacity-90 active:scale-98 shadow-lg shadow-primary/15' 
                      : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  {isInitialized ? (
                    <>
                      <Shield className="w-4 h-4" />
                      Sign in with Passkey
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Initializing Web3Auth...
                    </>
                  )}
                </button>

                <p className="text-[8px] text-white/30 mt-3">
                  Protected by cryptographic passkeys. No seed phrase required.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Android Gesture Bar */}
          <div className="h-4 flex items-center justify-center w-full">
            <div className="w-32 h-1 bg-white/20 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080c] flex items-center justify-center p-0 sm:p-6 select-none relative overflow-hidden font-sans text-white">
      {/* Glow Spots */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#c3f53b]/10 rounded-full filter blur-[130px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#5d8000]/10 rounded-full filter blur-[130px] pointer-events-none animate-pulse-glow" />

      {/* Bezel Frame Container */}
      <div className="w-full h-full min-h-screen sm:w-[390px] sm:h-[844px] sm:rounded-[55px] sm:border-[12px] sm:border-black sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col justify-between bg-[#0b0c10]/95 backdrop-blur-3xl">
        {/* Status Bar */}
        <div className="h-12 w-full flex justify-between items-center px-6 relative z-50 select-none">
          <span className="text-[11px] font-bold text-white/90">{timeString}</span>
          <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-3 w-28 h-6 bg-black rounded-full" />
          <div className="flex items-center gap-1.5 text-white/90">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <Battery className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Main Content Pane */}
        <div className="flex-grow overflow-y-auto hide-scrollbar px-5 pt-1 pb-24 relative">
          <AnimatePresence mode="wait">
            {renderTabContent()}
          </AnimatePresence>
        </div>

        {/* ======= GLASS BOTTOM NAV BAR ======= */}
        <div className="absolute bottom-5 inset-x-4 h-16 rounded-[24px] bg-[#14161c]/80 border border-white/5 backdrop-blur-xl flex justify-between items-center px-4 z-40 shadow-lg shadow-black/30">
          <div className="flex-1 flex justify-evenly items-center">
            <button 
              onClick={() => setActiveTab('dripper')} 
              className={`p-2.5 rounded-full transition-all active:scale-90 cursor-pointer ${activeTab === 'dripper' ? 'text-primary bg-white/5' : 'text-white/40 hover:text-white/80'}`}
            >
              <Droplet className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab('merchant')} 
              className={`p-2.5 rounded-full transition-all active:scale-90 cursor-pointer ${activeTab === 'merchant' ? 'text-primary bg-white/5' : 'text-white/40 hover:text-white/80'}`}
            >
              <ShoppingBag className="w-5 h-5" />
            </button>
          </div>
          
          {/* Middle Spacer for Floating Home button */}
          <div className="w-12"></div>
          
          <div className="flex-1 flex justify-evenly items-center">
            <button 
              onClick={() => setActiveTab('card')} 
              className={`p-2.5 rounded-full transition-all active:scale-90 cursor-pointer ${activeTab === 'card' ? 'text-primary bg-white/5' : 'text-white/40 hover:text-white/80'}`}
            >
              <CreditCard className="w-5 h-5" />
            </button>
            <button 
              onClick={logout} 
              className="p-2.5 rounded-full transition-all active:scale-90 hover:text-red-400 text-white/40 cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Floating Home Button */}
          <button 
            onClick={() => setActiveTab('home')}
            className={`absolute left-1/2 -top-5 -translate-x-1/2 w-14 h-14 rounded-full border-4 border-[#0b0c10] flex items-center justify-center shadow-xl transition-all cursor-pointer active:scale-90 ${activeTab === 'home' ? 'bg-primary text-black shadow-primary/20' : 'bg-neutral-800 text-white hover:bg-neutral-700'}`}
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        {/* Android Gesture Bar */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full pointer-events-none z-50" />
      </div>

      {/* ======= SEND SHEET MODAL ======= */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div 
            className="fixed inset-0 cursor-pointer" 
            onClick={() => { setShowSendModal(false); setSendTxHash(null); setSendAmount(''); setSendAddress(''); }} 
          />
          <motion.div 
            initial={{ opacity: 0, y: 150 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0f1115]/95 border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 w-full sm:max-w-[360px] shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto hide-scrollbar"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Send USDC</h3>
              <button 
                onClick={() => { setShowSendModal(false); setSendTxHash(null); setSendAmount(''); setSendAddress(''); }} 
                className="w-7 h-7 bg-white/5 border border-white/5 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-white/40 mb-1.5 block uppercase tracking-wider">Recipient Address</label>
                <input 
                  type="text" 
                  value={sendAddress} 
                  onChange={(e) => setSendAddress(e.target.value)}
                  placeholder="0x..." 
                  className="w-full glass-input rounded-xl py-3 px-4 font-mono text-xs" 
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-white/40 mb-1.5 block uppercase tracking-wider">Amount</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={sendAmount} 
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="0.00" 
                    className="w-full glass-input rounded-xl py-3 px-4 text-lg font-bold" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-bold text-xs">USDC</span>
                </div>
              </div>
              
              {sendTxHash && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                  <p className="text-[10px] text-green-400 font-bold">
                    ✅ Sent Successfully!
                  </p>
                  <a 
                    href={`https://sepolia.basescan.org/tx/${sendTxHash}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[9px] text-primary underline mt-0.5 block"
                  >
                    View on Explorer
                  </a>
                </div>
              )}

              <button 
                onClick={handleSend}
                disabled={isSending || !sendAmount || !sendAddress}
                className="w-full bg-primary hover:opacity-90 active:scale-98 text-black font-extrabold py-3.5 rounded-2xl transition-all disabled:opacity-40 text-xs mt-2 cursor-pointer"
              >
                {isSending ? '⏳ Sending USDC...' : 'Send Now'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ======= RECEIVE SHEET MODAL ======= */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div 
            className="fixed inset-0 cursor-pointer" 
            onClick={() => setShowReceiveModal(false)} 
          />
          <motion.div 
            initial={{ opacity: 0, y: 150 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0f1115]/95 border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 w-full sm:max-w-[360px] shadow-2xl relative z-10 text-center"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Receive Funds</h3>
              <button 
                onClick={() => setShowReceiveModal(false)} 
                className="w-7 h-7 bg-white/5 border border-white/5 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <ArrowDown className="w-5 h-5 text-primary" />
            </div>
            
            <p className="text-[10px] text-white/50 mb-6 leading-relaxed max-w-[240px] mx-auto">
              Transfer Base Sepolia ETH or USDC directly to your Gas-Free Smart Wallet.
            </p>
            
            <div className="glass-panel rounded-2xl p-4 border border-white/5 mb-2">
              {/* QR Mock */}
              <div className="w-32 h-32 bg-white rounded-xl mx-auto mb-4 p-2 flex items-center justify-center relative overflow-hidden">
                {/* Simulated QR Grid */}
                <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800 via-neutral-900 to-black rounded-lg flex items-center justify-center text-white text-[10px] font-mono">
                  <div className="text-center p-1.5">
                    <p className="font-bold text-primary">KOVA PAY</p>
                    <p className="text-[8px] opacity-60">USDC Smart Wallet</p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] font-mono break-all text-white/80 select-all mb-4 bg-black/40 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                {isLoading ? "Loading Wallet..." : address || "Connect to create address"}
              </p>
              
              <button 
                onClick={copyAddress}
                className="text-[10px] font-bold flex items-center gap-1.5 justify-center mx-auto transition-colors bg-primary text-black px-4 py-2 rounded-xl w-full cursor-pointer hover:opacity-90 active:scale-98"
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied Address!</> : <><Copy className="w-3.5 h-3.5" /> Copy Address</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default App
