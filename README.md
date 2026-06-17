# 💸 Kova Money — MVP

> **Self-custodial stablecoin spending wallet powered by Account Abstraction (ZeroDev) & Web3Auth**

[![Built with ZeroDev](https://img.shields.io/badge/Built%20with-ZeroDev-6C47FF?style=for-the-badge)](https://zerodev.app)
[![Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-0052FF?style=for-the-badge)](https://sepolia.basescan.org)
[![React + Vite](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge)](https://vitejs.dev)

---

## 🌟 What is Kova Money?

Kova Money is a next-generation **self-custodial crypto spending wallet** that lets users:
- Hold USDC in their own Smart Wallet (they own the keys, always)
- Create **Virtual Cards** with spend limits powered by Session Keys (ERC-4337)
- **Stream payments** to friends in real-time
- Pay merchants directly with USDC — gaslessly!

No seed phrases. No gas fees. Just your Google account.

---

## ✨ Features

| Feature | Description | Status |
|---|---|---|
| 🔐 **Passkey Login** | Login with Google via Web3Auth — no seed phrase | ✅ Live |
| 💳 **Virtual Card** | Set a USDC spend limit using ZeroDev Session Keys | ✅ Live |
| 🔒 **Card Lock/Revoke** | Lock & unlock card spending with on-chain policy | ✅ Live |
| 💸 **Send USDC** | Transfer USDC to any address, gaslessly | ✅ Live |
| 📥 **Receive** | Shareable wallet address with copy button | ✅ Live |
| 🌊 **Kova Streams** | Stream USDC to friends (Batched settlement) | ✅ Live |
| 🛒 **Merchant Spend** | Pay real on-chain merchant addresses | ✅ Live |
| 👤 **Profile Sync** | Auto-fetches name & profile pic from Web3Auth | ✅ Live |

---

## 🏗️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Framer Motion animations
- **Blockchain:** Base Sepolia (Testnet)
- **Account Abstraction:** [ZeroDev SDK](https://zerodev.app) (ERC-4337 Kernel v3.1)
- **Auth:** [Web3Auth](https://web3auth.io) (Google Passkey, Email OTP)
- **Token:** USDC on Base Sepolia (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`)
- **Gas Sponsorship:** ZeroDev Paymaster (users pay zero gas!)

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Kova-money/kova-money-test-mvp.git
cd kova-money-test-mvp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Fill in your `.env` file:

```env
# Get from: https://dashboard.zerodev.app
VITE_ZERODEV_PROJECT_ID=your_project_id

# Get from: https://dashboard.web3auth.io
VITE_WEB3AUTH_CLIENT_ID=your_client_id
VITE_WEB3AUTH_NETWORK=sapphire_devnet
```

### 4. Run locally

```bash
npm run dev
```

App will be live

---

## 🔑 How Session Keys Work (Virtual Card)

```
User sets $10 limit
        ↓
ZeroDev creates a Session Key
(a temporary private key scoped to USDC transfers ≤ $10)
        ↓
Session Key saved in localStorage
        ↓
Any payment above $10 → Blockchain REJECTS it automatically
        ↓
User clicks "Revoke" → Session Key deleted → Full wallet restored
```

This means even if someone steals the session key, they can only spend the card limit — your main wallet is always safe! 🛡️

---

## 🌊 Stream Architecture (Current)

Currently using **Batched Streaming**:
1. User starts a stream → UI timer runs
2. User pauses → All accrued USDC sent in ONE on-chain tx via Session Key
3. Gas efficient, settlement is real on-chain USDC transfer

**Future:** True per-second Superfluid streaming or Micro-tx streaming via Session Keys.

---

## 📁 Project Structure

```
src/
├── App.tsx              # Main UI — Home, Card, Stream, Merchant tabs
├── AuthContext.tsx      # Web3Auth login/logout + user profile
├── ZeroDevContext.tsx   # ZeroDev SDK — Smart Wallet, Session Keys, Balances
└── index.css           # Global styles (Trantor light theme)
```

---

## 🔗 Links

- **ZeroDev Dashboard:** [dashboard.zerodev.app](https://dashboard.zerodev.app)
- **Web3Auth Dashboard:** [dashboard.web3auth.io](https://dashboard.web3auth.io)
- **Base Sepolia Explorer:** [sepolia.basescan.org](https://sepolia.basescan.org)
- **Get Test USDC:** [faucet.circle.com](https://faucet.circle.com)

---

## ⚠️ Disclaimer

This is a **testnet MVP** built for demonstration purposes. Do NOT use real funds. All transactions are on Base Sepolia (testnet).

---

Made with ❤️ by [Naitik Rahane](https://github.com/NAITIKRAHANE)
