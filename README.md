# Metis Starter (Backend + n8n Workflow)

This package contains:
- **workflows/social_to_nft_mint.json** → n8n workflow (Webhook → Upload to Pinata → build metadata → call `/metis/mint`)
- **backend/** → Minimal Express backend using `ethers@6`

## Quick Start (Backend)
1. Install Node 18+
2. `cd backend && npm install`
3. Copy `.env.example` to `.env` and fill values (RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS)
4. `npm run start`
5. Test health: `GET http://localhost:4000/health`

## Endpoints
- `POST /metis/mint-requests` → create a job (returns { jobId })
- `POST /metis/mint` → called by n8n after uploading media+metadata; performs on-chain mint with `mintWithURI(to, metadataUri)`

## n8n
- Import `workflows/social_to_nft_mint.json`
- Set Pinata API credentials (built-in credential type)
- Create Webhook URL (POST): `/metis/social-mint`
- Example payload:
  ```json
  {
    "source": "instagram",
    "url": "https://example.com/media.jpg",
    "chainId": 137,
    "contract": "0xYourContractAddress",
    "toAddress": "0xUserAddress",
    "license": "CC-BY-4.0",
    "listPriceEth": "0.05"
  }
  ```

## Notes
- The backend assumes your contract exposes `mintWithURI(address,string)` and emits standard `Transfer` event.
- Replace the media fetch step with official platform APIs when applicable.
- For storage permanence, consider Arweave; swap the Pinata nodes for Arweave HTTP calls in the workflow.