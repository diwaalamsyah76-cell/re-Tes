import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ethers } from 'ethers';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(morgan('dev'));

const PORT = process.env.PORT || 4000;

// Env
const {
  RPC_URL,
  CHAIN_ID,
  PRIVATE_KEY,
  CONTRACT_ADDRESS
} = process.env;

// Minimal ABI for IMetisMintable
const abi = JSON.parse(fs.readFileSync(new URL('./IMetisMintable.json', import.meta.url)));

function getSigner() {
  if (!RPC_URL || !PRIVATE_KEY) throw new Error('RPC_URL/PRIVATE_KEY missing');
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  return wallet;
}

app.get('/health', (req,res)=> res.json({ ok:true }));

// Create a mint request (optional queue simulation)
app.post('/metis/mint-requests', async (req,res) => {
  const { source, url, chainId, contract, toAddress, license, listPriceEth } = req.body;
  if (!source || !url || !chainId || !contract || !toAddress) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const jobId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
  // Normally insert into DB; here we just echo
  return res.json({ jobId });
});

// Called by n8n after uploading to IPFS and building metadata
app.post('/metis/mint', async (req,res) => {
  try {
    const { jobId, storageUri, metadataUri, toAddress, chainId, contract } = req.body;
    if (!metadataUri || !toAddress || !contract) {
      return res.status(400).json({ error: 'metadataUri/toAddress/contract required' });
    }
    const signer = getSigner();
    const contractInst = new ethers.Contract(contract || CONTRACT_ADDRESS, abi, signer);
    // Call mintWithURI(address to, string tokenURI)
    const tx = await contractInst.mintWithURI(toAddress, metadataUri);
    const receipt = await tx.wait();
    // Try to parse tokenId from Transfer events (ERC721)
    let tokenId = null;
    for (const log of receipt.logs || []) {
      try {
        const parsed = contractInst.interface.parseLog(log);
        if (parsed && parsed.name === 'Transfer') {
          tokenId = parsed.args?.tokenId?.toString?.() || null;
        }
      } catch {}
    }
    return res.json({ ok:true, txHash: receipt.hash, tokenId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Metis backend listening on :${PORT}`);
});
