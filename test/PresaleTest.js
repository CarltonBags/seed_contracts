const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const {ethers, network} = require("hardhat");
const { HARDHAT_MEMPOOL_SUPPORTED_ORDERS } = require("hardhat/internal/constants");


describe("Presale", function() {

    let context;

    async function fixture() {
        //define callers
        const [sexy, admin, user] = await ethers.getSigners()

        //spoof NFT contract
        const NFTContract = await ethers.getContractFactory("D3NFT")
        const userConnectNFTFactory = NFTContract.connect(user)
        const nftContract = await userConnectNFTFactory.deploy("d3", "d3")
        const nftContractAddress = await nftContract.getAddress()
        //console.log("nft contract address", nftContractAddress)
        const nftBalance = await nftContract.connect(user).balanceOf(user)
        const userConnectNFT = nftContract.connect(user)
        //console.log("nft balance", nftBalance)
        const sexyaddress = await sexy.getAddress()
        const userAddress = await user.getAddress()
        //console.log("sexy address", sexyaddress)

        //deploy the eventhandler
        const Eventhandler = await ethers.getContractFactory("Eventhandler");
        const eventhandler = await Eventhandler.deploy();
        const eAddress= await eventhandler.getAddress();

        //deploy the presale factory
        const PresaleFactory = await ethers.getContractFactory("PresaleFactory");
        const presaleFactory = await PresaleFactory.deploy(eAddress, nftContractAddress);
        const presaleFactoryAddress = await presaleFactory.getAddress();

        //set presale factory as valid caller to eventhandler
        const sexyConnectEventhandler = eventhandler.connect(sexy)
        const addCaller = await sexyConnectEventhandler.setNewFactory(presaleFactoryAddress, true);

        //set presale factory active
        const sexyConnectFactory = presaleFactory.connect(sexy);
        const setActive = await sexyConnectFactory.setActive((true));

        //deploy token factory
        const TokenFactory = await ethers.getContractFactory("TokenFactory");
        const tokenFactory = await TokenFactory.deploy(eAddress);
        const tokenFactoryAddress = await tokenFactory.getAddress();
        await sexyConnectEventhandler.setNewFactory(tokenFactoryAddress, true);
        const sexyConnectTokenFactory = tokenFactory.connect(sexy);
        await sexyConnectTokenFactory.setActive(true)

        

        //deploy ERC-20 token
        const amount = ethers.parseEther("300");
        const userAmount = ethers.parseEther("100")
        const tokenDeployment = await sexyConnectTokenFactory.deployERC20("THREE","$THREE", amount)
        const receipt = await tokenDeployment.wait();
        const eventFilter = eventhandler.filters.TokenDeployed();
        const events = await eventhandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
        expect(events.length).to.be.above(0)

        let tokenAddress

            if (events.length > 0){
                tokenAddress = events[0].args.token
                console.log("tokenAddress", tokenAddress)
            }

        const userConnectFactory = presaleFactory.connect(user);

        const gatingToken = await sexyConnectTokenFactory.deployERC20("GATE","$GATE", amount)
        const receiptGate = await gatingToken.wait();
        const eventsGate = await eventhandler.queryFilter(eventFilter, receiptGate.blockNumber, receiptGate.blockNumber)
        let gatingAddress;

        if (eventsGate.length > 0){
            gatingAddress = eventsGate[0].args.token
        }
        


        //presaleParams
        const timestampRoundOne = await time.latest() + 1000
        //const timestampRoundOne = 1768833026
        const nftPrice = ethers.parseEther("0.1")
        const tokensPerLNFT = ethers.parseEther("1")
        const pricePerTokenRoundTwo = ethers.parseEther("0.2")
        const pricePerTokenRoundThree = ethers.parseEther("0.3")
        const maxWallet = ethers.parseEther("2")
        const gatingBalance = ethers.parseEther("50")
        const allocationSize = ethers.parseEther("75")
        const maxNFTSupply = 100

        const presaleParams = [timestampRoundOne, timestampRoundOne + 100, nftPrice, tokensPerLNFT, timestampRoundOne + 200, timestampRoundOne + 300, pricePerTokenRoundTwo, maxWallet, gatingBalance, allocationSize, maxNFTSupply, timestampRoundOne + 400, timestampRoundOne + 500, pricePerTokenRoundThree, maxWallet ]

        //deploy a presale to work with
        const presale = await sexyConnectFactory.deployPresale(tokenAddress, "")
        const receiptPresale = await presale.wait()

        const eventFilterPresale = eventhandler.filters.LNFTCollectionCreated()
        const eventsPresale = await eventhandler.queryFilter(eventFilterPresale, receiptPresale.blockNumber, receiptPresale.blockNumber)
        const presaleAddress = eventsPresale[0].args.collection

        // get Presale contract and connect
        const Presale = await ethers.getContractAt("Presale", presaleAddress)
        const sexyConnectPresale = Presale.connect(sexy)

        //approve presale contract to spend tokens
        const TokenContract = await ethers.getContractAt("CustomERC20",tokenAddress)
        const sexyConnectToken = TokenContract.connect(sexy)
        await sexyConnectToken.approve(presaleAddress, presaleParams[9])
        
        //create new presale
        await sexyConnectPresale.createPresale(presaleParams, gatingAddress)

        //connect user to the presale
        const userConnectPresale = Presale.connect(user)

        //connect user to the token
        const userConnectToken = TokenContract.connect(user)

        return { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, Presale, userConnectPresale, amount, userAmount, userConnectNFT, userAddress, sexyConnectPresale, userConnectToken};
    }

    beforeEach(async function(){
        context = await loadFixture(fixture)
    });

    describe("Presale Creation", function(){
        it("should allow the admin to create a new presale", async function(){
            const {sexy, sexyConnectFactory, presaleParams, gatingAddress, tokenFactoryAddress, eventhandler, tokenAddress} = context;
            const presale = await sexyConnectFactory.deployPresale(tokenAddress, "")
            const receipt = await presale.wait()

            const eventFilter = eventhandler.filters.LNFTCollectionCreated()
            const events = await eventhandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            const presaleAddress = events[0].args.collection

            // get Presale contract and connect
            const Presale = await ethers.getContractAt("Presale", presaleAddress)
            const sexyConnectPresale = Presale.connect(sexy)

            //approve presale contract to spend tokens
            const TokenContract = await ethers.getContractAt("CustomERC20",tokenAddress)
            const sexyConnectToken = TokenContract.connect(sexy)
            const approval = await sexyConnectToken.approve(presaleAddress, presaleParams[9])
            
            //create new presale
            await expect(sexyConnectPresale.createPresale(presaleParams, gatingAddress)).to.not.be.reverted

        })
        it("should prohibit anyone else to create a new presale", async function(){
            const {sexy, sexyConnectFactory, presaleParams, gatingAddress, tokenFactoryAddress, eventhandler, tokenAddress, user, userAmount} = context;
            const presale = await sexyConnectFactory.deployPresale(tokenAddress, "")
            const receipt = await presale.wait()

            const eventFilter = eventhandler.filters.LNFTCollectionCreated()
            const events = await eventhandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            const presaleAddress = events[0].args.collection
            console.log("collection", presaleAddress)

            //get Presale contract and connect
            const Presale = await ethers.getContractAt("Presale", presaleAddress)
            const sexyConnectPresale = Presale.connect(sexy)

            //approve presale contract to spend tokens
            const TokenContract = await ethers.getContractAt("CustomERC20",tokenAddress)
            const sexyConnectToken = TokenContract.connect(sexy)
            await sexyConnectToken.transfer(user, userAmount)

            const userConnectToken = TokenContract.connect(user)
            const approval = await userConnectToken.approve(presaleAddress, userAmount)
            
            //create new presale
            const userConnectPresale = Presale.connect(user)
            await expect(userConnectPresale.createPresale(presaleParams, gatingAddress)).to.be.reverted
        })
    })

    describe("Round 1 Presale functions", function(){
        it("should allow a D3 NFT holder to buy an L-NFT", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress } = context

            //set block timestamp to round 1
            const roundOneStart = await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenIDs = ["1", "2", "3"]
            const tokenID = 1
            const value = ethers.parseEther("0.3")
            const amount = 3

            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs, {value: value})).to.not.be.reverted
            
            //check balance of LNFT after buy
            const userBalance = await userConnectPresale.balanceOf(userAddress, tokenID)
            expect(userBalance).to.equal(amount);
        })  
        it("should allow an LNFT-Holder to withdraw after and receive the amount of tokens", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //set block timestamp to round 1
            const roundOneStart = await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenIDs = ["1"]
            const tokenID = 1
            const value = ethers.parseEther("0.1")
            const amount = 1

            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs, {value: value})).to.not.be.reverted
            
            //check balance of LNFT after buy
            const userBalance = await userConnectPresale.balanceOf(userAddress, tokenID)
            expect(userBalance).to.equal(amount);

            //fast forward to end of presale
            await time.increaseTo(presaleParams[12])
            await sexyConnectPresale.releaseTokens(true)

            //withdraw the the tokens by burning the LNFT
            const userWithdrawal = await userConnectPresale.withdrawTokensRoundOne(amount)
            const userNFTBalanceAfter = await userConnectPresale.balanceOf(userAddress, tokenID)

            expect(userNFTBalanceAfter).to.equal(0)

            //check if user received his presale tokens
            const userTokenBalance = await userConnectToken.balanceOf(userAddress)
            console.log("user token balance", userTokenBalance)
        })
        it("should track the LNFT-Supply correctly", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //set block timestamp to round 1
            const roundOneStart = await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenIDs = ["1","2","3"]
            const tokenID = 1
            const value = ethers.parseEther("0.3")
            const amount = 3

            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs, {value: value})).to.not.be.reverted
            
            //check balance of LNFT after buy
            const userBalance = await userConnectPresale.balanceOf(userAddress, tokenID)
            expect(userBalance).to.equal(amount);

            //check the current LNFT supply BEFORE the user burned them
            const lnftBalanceBefore = await userConnectPresale.currentNFTSupply()
                //console.log("lnftBalanceBefore", lnftBalanceBefore)
            expect(lnftBalanceBefore).to.equal(amount)

            //fast forward to end of presale
            await time.increaseTo(presaleParams[12])
            await sexyConnectPresale.releaseTokens(true)

            //withdraw the the tokens by burning the LNFT
            const userWithdrawal = await userConnectPresale.withdrawTokensRoundOne(amount)

            //check the current LNFT supply AFTER the user burned them
            const lnftBalanceAfter = await userConnectPresale.currentNFTSupply()
                //console.log("lnftBalanceAfter", lnftBalanceAfter)
            expect(lnftBalanceAfter).to.equal(0)
        })
        it("should track the allocationSize correctly", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //set block timestamp to round 1
            const roundOneStart = await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenIDs = ["1","2","3"]
            const tokenID = 1
            const value = ethers.parseEther("0.3")
            const amount = 3

            //check allocationSize BEFORE buy
            const allocationSizeBeforeBuy = await userConnectPresale.allocationSize()
            console.log("allocationSizeBeforeBuy", allocationSizeBeforeBuy)
            expect(allocationSizeBeforeBuy).to.equal(presaleParams[9])

            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs, {value: value})).to.not.be.reverted
            
            //check balance of LNFT after buy
            const userBalance = await userConnectPresale.balanceOf(userAddress, tokenID)

            //check allocationSize AFTER buy
            const allocationSizeAfterBuy = await userConnectPresale.allocationSize()
            console.log("allocationSizeAfterBuy", allocationSizeAfterBuy)

            const parsedAmount = ethers.parseEther(amount.toString())
            expect(allocationSizeAfterBuy).to.equal(allocationSizeBeforeBuy - parsedAmount)

        })


    })
})