const {ethers, network} = require("hardhat");


//ipfs d3
//"https://gateway.pinata.cloud/ipfs/bafkreifjpmsuly7jwhxklsifspwgqrn54ojbipq3lsvsu5oyur5uhg67sy"

const main = {

    addresses:{
        bsc:{
            d3NFT: "0x967841Fadf1DcdC9DDd3b0BE2948a5eded9eDe17",
            eventhandler: "0xec5Eb1bA4E6fE9dF511d7634e6932690709912c1",
            presaleFactory: "0x3Bfc3e973D4bb77d7483d3D7637464F17AC51618",
            tokenFactory: "0x529D4069883AcdF4aD8352BCA0DeA3CF00757185",
            gatingToken:"0xB1518A279C27Df3f96ba4d8b90Ef0e7E5Cbf5a24",
        },

    },

    deploy:
        async () => {
            try{
                const privateKey = process.env.PRIVATE_KEY_1
                const wallet = new ethers.Wallet(privateKey, ethers.provider)

                //deploy fake D3 NFT-Contract
                console.log("deploy D3-NFT Contract")
                const D3Factory = await ethers.getContractFactory("D3NFT", wallet)
                const d3Factory = await D3Factory.deploy("D","D")
                const d3Address = await d3Factory.getAddress()

                console.log("D3NFT contract address", d3Address)

                //deploy the eventhandler
                console.log("deploy Eventhandler Contract")

                const Eventhandler = await ethers.getContractFactory("Eventhandler", wallet);
                const eventhandler = await Eventhandler.deploy();
                const eAddress= await eventhandler.getAddress();

                console.log("Eventhandler contract address", eAddress)

                //deploy the presale factory
                console.log("deploy Presale Factory")

                const PresaleFactory = await ethers.getContractFactory("PresaleFactory", wallet);
                const presaleFactory = await PresaleFactory.deploy(eAddress, d3Address);
                const presaleFactoryAddress = await presaleFactory.getAddress();

                console.log("Presale Factory Address", presaleFactoryAddress)

                //set Presale Factory as valid caller and set presale factory active
                const walletConnectEventhandler = eventhandler.connect(wallet)
                const addCaller = await walletConnectEventhandler.setNewFactory(presaleFactoryAddress, true)

                console.log("params on presale factory contract set")

                //deploy token factory
                console.log("deploy token factory")

                const TokenFactory = await ethers.getContractFactory("TokenFactory", wallet);
                const tokenFactory = await TokenFactory.deploy(eAddress);
                const tokenFactoryAddress = await tokenFactory.getAddress();

                console.log("token factory address", tokenFactoryAddress)

                //set params for token factory
                await walletConnectEventhandler.setNewFactory(tokenFactoryAddress, true);
                const walletConnectTokenFactory = tokenFactory.connect(wallet);
                await walletConnectTokenFactory.setActive(true)

                console.log("params on token factory set")

                //deploy gating token
                console.log("deploy the gating token")

                const amount = ethers.parseEther("1000000")
                const deployGatingToken = await walletConnectTokenFactory.deployERC20("GATE", "$GATE", amount)
                const deployGatingTokenReceipt = await deployGatingToken.wait()

                const eventFilter = eventhandler.filters.TokenDeployed();
                const deployEvents = await eventhandler.queryFilter(eventFilter, deployGatingTokenReceipt.blockNumber, deployGatingTokenReceipt.blockNumber)

                let gatingAddress

                if (deployEvents.length > 0){
                    gatingAddress = deployEvents[0].args.token
                }

                console.log("gating token address", gatingAddress)


            }
            catch(e){console.log(e)}
        },
    mintERC20:
        async () => {
            console.log("deploy the gating token")

            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)

            const TokenFactory = await ethers.getContractAt("TokenFactory", "0x529D4069883AcdF4aD8352BCA0DeA3CF00757185")
            const walletConnectTokenFactory = TokenFactory.connect(wallet)
            const eventhandler = await ethers.getContractAt("Eventhandler", "0xec5Eb1bA4E6fE9dF511d7634e6932690709912c1")

            const amount = ethers.parseEther("1000000")
            const deployGatingToken = await walletConnectTokenFactory.deployERC20("GATE", "$GATE", amount)
            const deployGatingTokenReceipt = await deployGatingToken.wait()

            const eventFilter = eventhandler.filters.TokenDeployed();
            const deployEvents = await eventhandler.queryFilter(eventFilter, deployGatingTokenReceipt.blockNumber, deployGatingTokenReceipt.blockNumber)

            let gatingAddress

            if (deployEvents.length > 0){
                gatingAddress = deployEvents[0].args.token
            }

            console.log("gating token address", gatingAddress)
        },
}

//main.deploy();
main.mintERC20();