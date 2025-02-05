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

        const gatingContract = await ethers.getContractAt("CustomERC20", gatingAddress)
        const transfer = await gatingContract.connect(sexy).transfer(user, userAmount)

        //deploy staking contract
        const StakingContract = await ethers.getContractFactory("D3Staking")
        const stakingContract = await StakingContract.deploy("dSTAKE", "$dSTAKE", gatingAddress)
        const stakingAddress = await stakingContract.getAddress()
        const userConnectStaking = stakingContract.connect(user)


        //presaleParams
        const timestampRoundOne = await time.latest() + 1000

        //const timestampRoundOne = 1768833026
        const nftPrice = ethers.parseEther("0.1")
        const tokensPerLNFT = ethers.parseEther("1")
        const pricePerTokenRoundTwo = ethers.parseEther("0.2")
        const pricePerTokenRoundThree = ethers.parseEther("0.3")
        const maxWallet = ethers.parseEther("2")
        const gatingBalance = ethers.parseEther("50")
        const allocationSize = ethers.parseEther("5")
        const maxNFTSupply = 5

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
        await sexyConnectPresale.createPresale(presaleParams, stakingAddress)

        //connect user to the presale
        const userConnectPresale = Presale.connect(user)

        //connect user to the token
        const userConnectToken = TokenContract.connect(user)

        return { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, Presale, userConnectPresale, amount, userAmount, userConnectNFT, userAddress, sexyConnectPresale, userConnectToken, presaleAddress, stakingContract, userConnectStaking, stakingAddress, gatingToken, gatingContract, Presale};
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
        it("should revert when the max LNFT-supply is to be exceeded", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //mint 6 NFTs while the total siupply is set to 5
            await time.increaseTo(presaleParams[0])
            const tokenIDs = ["1","2","3","5","6","7"]
            const value = ethers.parseEther("0.6")
            expect(userConnectPresale.buyBatchLNFT(6, tokenIDs, {value: value})).to.be.revertedWithCustomError
        })
        it("should revert when round 1 is not live", async function (){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //increase timestamp to just before round 1
            await time.increaseTo(presaleParams[0] - 10 )

            //set presale params
            const tokenIDs = ["1","2","3"]
            const value = ethers.parseEther("0.3")
            const amount = 3

            //buy round 1
            expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs, {value: value})).to.be.revertedWithCustomError

            //forward to after round 1
            await time.increaseTo(presaleParams[4])
            
            //buy round 1
            expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs, {value: value})).to.be.revertedWithCustomError
        })

    describe("Round 2 Presale functions", function(){
        it("should allow a staker with valid stake to buy tokens", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, stakingContract, userConnectStaking, stakingAddress, gatingToken, gatingContract } = context

            //user approves tokens
            const stakingAmount = ethers.parseEther("75")
            const approval = await gatingContract.connect(user).approve(stakingAddress, stakingAmount)

            //user stakes tokens
            const userStake = await userConnectStaking.mint(stakingAmount)
            const userStakedAmount = await userConnectStaking.balanceOf(userAddress)
            console.log("user staked amount", userStakedAmount)

            //forward to round 2 start
            await time.increaseTo(presaleParams[4])

            //buy round 2
            const buyAmount = ethers.parseEther("1")
            const value = ethers.parseEther("0.2")
            await expect(userConnectPresale.buyRoundTwoAndThree(buyAmount, 2, {value: value})).to.not.be.reverted

            //check presale Balance
            const presaleBalance = await userConnectPresale.balances(userAddress)
            expect(presaleBalance).to.equal(buyAmount)
        })
        it("should revert if a staker has an insufficient staking balance", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, stakingContract, userConnectStaking, stakingAddress, gatingToken, gatingContract } = context

            //user approves tokens
            const stakingAmount = ethers.parseEther("40")
            const approval = await gatingContract.connect(user).approve(stakingAddress, stakingAmount)

            //user stakes tokens
            const userStake = await userConnectStaking.mint(stakingAmount)
            const userStakedAmount = await userConnectStaking.balanceOf(userAddress)
            console.log("user staked amount", userStakedAmount)

            //forward to round 2 start
            await time.increaseTo(presaleParams[4])

            //buy round 2
            const buyAmount = ethers.parseEther("1")
            const value = ethers.parseEther("0.2")
            expect(userConnectPresale.buyRoundTwoAndThree(buyAmount, 2, {value: value})).to.be.revertedWithCustomError

            //check presale Balance
            const presaleBalance = await userConnectPresale.balances(userAddress)
            expect(presaleBalance).to.equal(0)
        })
        it("should revert if a staking timestamp is after the cutoff point", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, stakingContract, userConnectStaking, stakingAddress, gatingToken, gatingContract } = context

            //fast forward to round 2 start
            await time.increaseTo(presaleParams[4])

            //user approves token
            const stakingAmount = ethers.parseEther("75")
            const approval = await gatingContract.connect(user).approve(stakingAddress, stakingAmount)

            //user stakes tokens
            const userStake = await userConnectStaking.mint(stakingAmount)
            const userStakedAmount = await userConnectStaking.balanceOf(userAddress)
            console.log("user staked amount", userStakedAmount)

            //buy round 2
            const buyAmount = ethers.parseEther("1")
            const value = ethers.parseEther("0.2")
            userConnectPresale.buyRoundTwoAndThree(buyAmount, 2, {value: value})

            //check presale Balance
            const presaleBalance = await userConnectPresale.balances(userAddress)
            expect(presaleBalance).to.equal(0)
        })
        it("should allow a buyer to withdraw tokens", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, stakingContract, userConnectStaking, stakingAddress, gatingToken, gatingContract } = context

            //user approves tokens
            const stakingAmount = ethers.parseEther("75")
            const approval = await gatingContract.connect(user).approve(stakingAddress, stakingAmount)

            //user stakes tokens
            const userStake = await userConnectStaking.mint(stakingAmount)

            //forward to round 2 start
            await time.increaseTo(presaleParams[4])

            //buy round 2
            const buyAmount = ethers.parseEther("1")
            const value = ethers.parseEther("0.2")
            await expect(userConnectPresale.buyRoundTwoAndThree(buyAmount, 2, {value: value})).to.not.be.reverted

            //check presale Balance
            const presaleBalance = await userConnectPresale.balances(userAddress)

            //fast forward to presale end
            await time.increaseTo(presaleParams[12])

            //unlock tokens
            await sexyConnectPresale.releaseTokens(true)

            //user withdraw presale tokens
            await expect(userConnectPresale.withdrawTokensRoundTwoAndThree(buyAmount)).to.not.be.reverted

            //check user contract balance after withdrawal
            const contractBalance = await userConnectPresale.balances(userAddress)
            expect(contractBalance).to.equal(0)

            //check user wallet balance after withdrawal
            const userBalance = await userConnectToken.balanceOf(userAddress)
            expect(userBalance).to.equal(buyAmount)
        })

    })
    describe("Round 3 Presale functions", function(){
        it("should allow any buyer to buy tokens", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, stakingContract, userConnectStaking, stakingAddress, gatingToken, gatingContract } = context

            //forward to round 3 start
            await time.increaseTo(presaleParams[11])

            //buy round 3
            const buyAmount = ethers.parseEther("1")
            const value = ethers.parseEther("0.3")
            await userConnectPresale.buyRoundTwoAndThree(buyAmount, 3, {value: value})

            //check presale Balance
            const presaleBalance = await userConnectPresale.balances(userAddress)
            expect(presaleBalance).to.equal(buyAmount)
        })
        it("should allow a buyer to withdraw tokens", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, stakingContract, userConnectStaking, stakingAddress, gatingToken, gatingContract } = context

            //forward to round 3 start
            await time.increaseTo(presaleParams[11])

            //buy round 3
            const buyAmount = ethers.parseEther("1")
            const value = ethers.parseEther("0.3")
            await expect(userConnectPresale.buyRoundTwoAndThree(buyAmount, 3, {value: value})).to.not.be.reverted

            //check presale Balance
            const presaleBalance = await userConnectPresale.balances(userAddress)

            //fast forward to presale end
            await time.increaseTo(presaleParams[12])

            //unlock tokens
            await sexyConnectPresale.releaseTokens(true)

            //user withdraw presale tokens
            await expect(userConnectPresale.withdrawTokensRoundTwoAndThree(buyAmount)).to.not.be.reverted

            //check user contract balance after withdrawal
            const contractBalance = await userConnectPresale.balances(userAddress)
            expect(contractBalance).to.equal(0)

            //check user wallet balance after withdrawal
            const userBalance = await userConnectToken.balanceOf(userAddress)
            expect(userBalance).to.equal(buyAmount)
        })
        
    })
    describe("Presale Logic", function (){
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
        it("should track user ETH balance and contract balance correctly", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, presaleAddress } = context

            //set block timestamp to round 1
            await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenIDs = ["1","2","3"]
            const value = ethers.parseEther("0.3")
            const amount = 3
          
            //buy round 1
            await userConnectPresale.buyBatchLNFT(amount, tokenIDs, {value: value})

            //check contract balance
            const contractETHBalance = await ethers.provider.getBalance(presaleAddress)
            expect(contractETHBalance).to.equal(value)

            //check tracking balance
            const userETHBalance = await userConnectPresale.ETHBalances(userAddress)
            expect(userETHBalance).to.equal(value)            

        })
        it("should allow a user to withdraw ETH when presale is canceled", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, presaleAddress, presaleContract, Presale } = context

            //move timestamp forward to round 1
            await time.increaseTo(presaleParams[0])

            //buy round 1
            const value = ethers.parseEther("0.2")
            const amount = 2
            const d3IDs = [1,2]
            const userBuy = await userConnectPresale.buyBatchLNFT(amount, d3IDs, {value:value})

            //cancel presale
            await expect(sexyConnectPresale.cancelPresale(true)).to.not.be.reverted

            //check user ETH balance on presale
            const presaleBalance = await ethers.provider.getBalance(Presale)
            expect(presaleBalance).to.equal(value)

            //withdraw user balance after cancelation
            await userConnectPresale.userETHWithdrawal()
            const presaleBalanceAfter = await ethers.provider.getBalance(Presale)
            expect(presaleBalanceAfter).to.equal(0)
        })
    })


    })
})