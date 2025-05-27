
The Smart contracts in this repository are designed to create regular ERC20 Tokens and Presales



**Eventhandler**:
this contract is simply there to pick up all relevant events emitted by the presale-factory, the token-factory and the individual presales.


**TokenFactory**:
Allows the owner of the factory to mint regular ERC20 Tokens that have no owner functions and emits a creation event through the Eventhandler.

**D3Staking**:
The Staking Contract that allows users to stake a specific Token (set by the Deployer) that tracks staking balances of the users which is needed later for Round 2 of presale, which is restricted to users that had a sufficient stake prior to the begin of the presale.

**PresaleFactory**:
Allows the owner of the factory to create new Presale contracts. 


**Presale**:
The core of the protocol. The Presale contract is designed to allow the admin of the contract to create a presale of a regular ERC20 token in a centralized way. The presales are set to function in the following way:

- Round 1: NFT Round
-- Buyers have to hold a specific ERC721 NFT (The D3 NFT), to be able to buy in Round 1.

- Round 2: Private Round
-- Buyers have to hold a specific balance of the Staking-Token (D3Staking) to be able to buy in Round 2.

- Round 3: Public Round
-- The remaining allocation is sold publicly with the only restriction being a max balance per wallet.

- Cancellation: if a presale fails to reach the softcap or is cancelled by an admin, all users should be able to withdraw their deposited USDC and the presale owner should be able to withdraw the presale tokens.<

- Success: If a presale reaches the softcap and is not cancelled, the owner should be allowed to withdraw the raised USDC while the presale participants should be able to withdraw their presale balance.


**Explainer:
The Presale contract inherits from ERC-1155, because the presale mechanism for Round 1 requires the contract to mint NFTs to the user and also burn them when the users withdraw the tokens. The NFTs are just receipts for the user buying in Round 1. The other NFT collection involved here is the ERC-721 collection (D3NFT). These are used to verify if a user is eligible to buy in Round 1. They are an entry requirement.

