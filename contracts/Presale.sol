// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

//TO DOs
// - check conditions for loops (i= 0 / 1)
// - make function to move back presale start

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
//import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
//import "@openzeppelin/contracts/token/ERC721/utils/ERC721Utils.sol";
//import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
//import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Utils.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Arrays.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";


/**
 * @dev Implementation of the basic standard multi-token.
 * See https://eips.ethereum.org/EIPS/eip-1155
 * Originally based on code by Enjin: https://github.com/enjin/erc-1155
 */
abstract contract ERC1155 is Context, ERC165, IERC1155, IERC1155MetadataURI, IERC1155Errors {
    using Arrays for uint256[];
    using Arrays for address[];

    mapping(uint256 id => mapping(address account => uint256)) private _balances;

    mapping(address account => mapping(address operator => bool)) private _operatorApprovals;

    // Used as the URI for all token types by relying on ID substitution, e.g. https://token-cdn-domain/{id}.json
    string private _uri;

    /**
     * @dev See {_setURI}.
     */
    constructor(string memory uri_) {
        _setURI(uri_);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC1155).interfaceId ||
            interfaceId == type(IERC1155MetadataURI).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC1155MetadataURI-uri}.
     *
     * This implementation returns the same URI for *all* token types. It relies
     * on the token type ID substitution mechanism
     * https://eips.ethereum.org/EIPS/eip-1155#metadata[defined in the ERC].
     *
     * Clients calling this function must replace the `\{id\}` substring with the
     * actual token type ID.
     */
    function uri(uint256 /* id */) public view virtual returns (string memory) {
        return _uri;
    }

    /**
     * @dev See {IERC1155-balanceOf}.
     */
    function balanceOf(address account, uint256 id) public view virtual returns (uint256) {
        return _balances[id][account];
    }

    /**
     * @dev See {IERC1155-balanceOfBatch}.
     *
     * Requirements:
     *
     * - `accounts` and `ids` must have the same length.
     */
    function balanceOfBatch(
        address[] memory accounts,
        uint256[] memory ids
    ) public view virtual returns (uint256[] memory) {
        if (accounts.length != ids.length) {
            revert ERC1155InvalidArrayLength(ids.length, accounts.length);
        }

        uint256[] memory batchBalances = new uint256[](accounts.length);

        for (uint256 i = 0; i < accounts.length; ++i) {
            batchBalances[i] = balanceOf(accounts.unsafeMemoryAccess(i), ids.unsafeMemoryAccess(i));
        }

        return batchBalances;
    }

    /**
     * @dev See {IERC1155-setApprovalForAll}.
     */
    function setApprovalForAll(address operator, bool approved) public virtual {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /**
     * @dev See {IERC1155-isApprovedForAll}.
     */
    function isApprovedForAll(address account, address operator) public view virtual returns (bool) {
        return _operatorApprovals[account][operator];
    }

    /**
     * @dev See {IERC1155-safeTransferFrom}.
     */
    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data) public virtual {
        address sender = _msgSender();
        if (from != sender && !isApprovedForAll(from,  sender)) {
            revert ERC1155MissingApprovalForAll(sender, from);
        }
        _safeTransferFrom(from, to, id, value, data);
    }

    /**
     * @dev See {IERC1155-safeBatchTransferFrom}.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public virtual {
        address sender = _msgSender();
        if (from != sender && !isApprovedForAll(from, sender)) {
            revert ERC1155MissingApprovalForAll(sender, from);
        }
        _safeBatchTransferFrom(from, to, ids, values, data);
    }

    /**
     * @dev Transfers a `value` amount of tokens of type `id` from `from` to `to`. Will mint (or burn) if `from`
     * (or `to`) is the zero address.
     *
     * Emits a {TransferSingle} event if the arrays contain one element, and {TransferBatch} otherwise.
     *
     * Requirements:
     *
     * - If `to` refers to a smart contract, it must implement either {IERC1155Receiver-onERC1155Received}
     *   or {IERC1155Receiver-onERC1155BatchReceived} and return the acceptance magic value.
     * - `ids` and `values` must have the same length.
     *
     * NOTE: The ERC-1155 acceptance check is not performed in this function. See {_updateWithAcceptanceCheck} instead.
     */
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal virtual {
        if (ids.length != values.length) {
            revert ERC1155InvalidArrayLength(ids.length, values.length);
        }

        address operator = _msgSender();

        for (uint256 i = 0; i < ids.length; ++i) {
            uint256 id = ids.unsafeMemoryAccess(i);
            uint256 value = values.unsafeMemoryAccess(i);

            if (from != address(0)) {
                uint256 fromBalance = _balances[id][from];
                if (fromBalance < value) {
                    revert ERC1155InsufficientBalance(from, fromBalance, value, id);
                }
                unchecked {
                    // Overflow not possible: value <= fromBalance
                    _balances[id][from] = fromBalance - value;
                }
            }

            if (to != address(0)) {
                _balances[id][to] += value;
            }
        }

        if (ids.length == 1) {
            uint256 id = ids.unsafeMemoryAccess(0);
            uint256 value = values.unsafeMemoryAccess(0);
            emit TransferSingle(operator, from, to, id, value);
        } else {
            emit TransferBatch(operator, from, to, ids, values);
        }
    }

    /**
     * @dev Version of {_update} that performs the token acceptance check by calling
     * {IERC1155Receiver-onERC1155Received} or {IERC1155Receiver-onERC1155BatchReceived} on the receiver address if it
     * contains code (eg. is a smart contract at the moment of execution).
     *
     * IMPORTANT: Overriding this function is discouraged because it poses a reentrancy risk from the receiver. So any
     * update to the contract state after this function would break the check-effect-interaction pattern. Consider
     * overriding {_update} instead.
     */
    function _updateWithAcceptanceCheck(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal virtual {
        _update(from, to, ids, values);
        if (to != address(0)) {
            address operator = _msgSender();
            if (ids.length == 1) {
                uint256 id = ids.unsafeMemoryAccess(0);
                uint256 value = values.unsafeMemoryAccess(0);
                ERC1155Utils.checkOnERC1155Received(operator, from, to, id, value, data);
            } else {
                ERC1155Utils.checkOnERC1155BatchReceived(operator, from, to, ids, values, data);
            }
        }
    }

    /**
     * @dev Transfers a `value` tokens of token type `id` from `from` to `to`.
     *
     * Emits a {TransferSingle} event.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - `from` must have a balance of tokens of type `id` of at least `value` amount.
     * - If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155Received} and return the
     * acceptance magic value.
     */
    function _safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data) internal {
        if (to == address(0)) {
            revert ERC1155InvalidReceiver(address(0));
        }
        if (from == address(0)) {
            revert ERC1155InvalidSender(address(0));
        }
        (uint256[] memory ids, uint256[] memory values) = _asSingletonArrays(id, value);
        _updateWithAcceptanceCheck(from, to, ids, values, data);
    }

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] version of {_safeTransferFrom}.
     *
     * Emits a {TransferBatch} event.
     *
     * Requirements:
     *
     * - If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155BatchReceived} and return the
     * acceptance magic value.
     * - `ids` and `values` must have the same length.
     */
    function _safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal {
        if (to == address(0)) {
            revert ERC1155InvalidReceiver(address(0));
        }
        if (from == address(0)) {
            revert ERC1155InvalidSender(address(0));
        }
        _updateWithAcceptanceCheck(from, to, ids, values, data);
    }

    /**
     * @dev Sets a new URI for all token types, by relying on the token type ID
     * substitution mechanism
     * https://eips.ethereum.org/EIPS/eip-1155#metadata[defined in the ERC].
     *
     * By this mechanism, any occurrence of the `\{id\}` substring in either the
     * URI or any of the values in the JSON file at said URI will be replaced by
     * clients with the token type ID.
     *
     * For example, the `https://token-cdn-domain/\{id\}.json` URI would be
     * interpreted by clients as
     * `https://token-cdn-domain/000000000000000000000000000000000000000000000000000000000004cce0.json`
     * for token type ID 0x4cce0.
     *
     * See {uri}.
     *
     * Because these URIs cannot be meaningfully represented by the {URI} event,
     * this function emits no events.
     */
    function _setURI(string memory newuri) internal virtual {
        _uri = newuri;
    }

    /**
     * @dev Creates a `value` amount of tokens of type `id`, and assigns them to `to`.
     *
     * Emits a {TransferSingle} event.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155Received} and return the
     * acceptance magic value.
     */
    function _mint(address to, uint256 id, uint256 value, bytes memory data) internal {
        if (to == address(0)) {
            revert ERC1155InvalidReceiver(address(0));
        }
        (uint256[] memory ids, uint256[] memory values) = _asSingletonArrays(id, value);
        _updateWithAcceptanceCheck(address(0), to, ids, values, data);
    }

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] version of {_mint}.
     *
     * Emits a {TransferBatch} event.
     *
     * Requirements:
     *
     * - `ids` and `values` must have the same length.
     * - `to` cannot be the zero address.
     * - If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155BatchReceived} and return the
     * acceptance magic value.
     */
    function _mintBatch(address to, uint256[] memory ids, uint256[] memory values, bytes memory data) internal {
        if (to == address(0)) {
            revert ERC1155InvalidReceiver(address(0));
        }
        _updateWithAcceptanceCheck(address(0), to, ids, values, data);
    }

    /**
     * @dev Destroys a `value` amount of tokens of type `id` from `from`
     *
     * Emits a {TransferSingle} event.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `from` must have at least `value` amount of tokens of type `id`.
     */
    function _burn(address from, uint256 id, uint256 value) internal {
        if (from == address(0)) {
            revert ERC1155InvalidSender(address(0));
        }
        (uint256[] memory ids, uint256[] memory values) = _asSingletonArrays(id, value);
        _updateWithAcceptanceCheck(from, address(0), ids, values, "");
    }

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] version of {_burn}.
     *
     * Emits a {TransferBatch} event.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `from` must have at least `value` amount of tokens of type `id`.
     * - `ids` and `values` must have the same length.
     */
    function _burnBatch(address from, uint256[] memory ids, uint256[] memory values) internal {
        if (from == address(0)) {
            revert ERC1155InvalidSender(address(0));
        }
        _updateWithAcceptanceCheck(from, address(0), ids, values, "");
    }

    /**
     * @dev Approve `operator` to operate on all of `owner` tokens
     *
     * Emits an {ApprovalForAll} event.
     *
     * Requirements:
     *
     * - `operator` cannot be the zero address.
     */
    function _setApprovalForAll(address owner, address operator, bool approved) internal virtual {
        if (operator == address(0)) {
            revert ERC1155InvalidOperator(address(0));
        }
        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    /**
     * @dev Creates an array in memory with only one value for each of the elements provided.
     */
    function _asSingletonArrays(
        uint256 element1,
        uint256 element2
    ) internal pure returns (uint256[] memory array1, uint256[] memory array2) {
        assembly ("memory-safe") {
            // Load the free memory pointer
            array1 := mload(0x40)
            // Set array length to 1
            mstore(array1, 1)
            // Store the single element at the next word after the length (where content starts)
            mstore(add(array1, 0x20), element1)

            // Repeat for next array locating it right after the first array
            array2 := add(array1, 0x40)
            mstore(array2, 1)
            mstore(add(array2, 0x20), element2)

            // Update the free memory pointer by pointing after the second array
            mstore(0x40, add(array2, 0x40))
        }
    }
}


interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address owner);
}

interface IERC20{
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function decimals() external view returns (uint8);
}

interface ID3Staking{
    function getStakingParams(address staker) external view returns (uint balance, uint timestamp);
}

interface IEventhandler{
    function lNFTCollectionCreated(address collection, address token, string calldata uri, address owner) external;
    function lNFTBought(address buyer, address presale, uint amountTokens, uint amountUSDC) external;
    function tokensBought(address buyer, address presale, address token, uint amount, uint amountUSDC, uint8 round) external;
    function tokensWithdrawn(address buyer, address presale, address token, uint amount) external;
    function userUSDCWithdrawal(address user, address presale, uint amountUSDC) external;
    function presaleCreated(address presale, address token, uint [] calldata params, address gatingToken) external;
    function setNewCaller(address caller) external;
    function presaleMoved(address presale, uint delay) external;
    function presalePaused(address presale, bool paused) external;
    function presaleCanceled(address presale, bool canceled) external;
    function presaleFinalised(address presale) external;
}


contract Presale is ERC1155, ReentrancyGuard {

    mapping(address => bool) private admins;
    mapping(uint => bool) private alreadyBought; //storing which of the holders of the d3 nft have bought.
    mapping(address => uint) public balances; //storing the withdrawable presale token balance of the user.
    mapping(address => uint) public usdcBalances; //storing the amount of ETH deposited by users.
   
    //address private presaleMaster;
    address private eventhandler;
    address public tokenAddress;
    uint8 tokenDecimals;
    address private usdc;
    address private nftAddress;
    address private presaleMaster;
    uint public allocationSize;
    uint private softcap;
    uint public currentNFTSupply;

    bool public unlocked; //if true, tokens are withdrawable by buyers
    bool public canceled; //if true, users can withdraw their deposited ETH
    bool finalised; //prevents calling the finalisePresale function twice
    bool presaleCreated; //if true, presale cannot be created again

    struct Round1Params{
        uint start;
        uint end;
        uint pricePerLNFT;
        uint tokensPerLNFT;
        uint maxNFTSupply;
    }

    struct Round2Params{
        uint start;
        uint end;
        uint pricePerToken;
        uint maxWallet;
        address gatingToken;
        uint gatingBalance;
    }

    struct Round3Params{
        uint start;
        uint end;
        uint pricePerToken;
        uint maxWallet;
    }

    Round1Params params1;
    Round2Params params2;
    Round3Params params3;

    error Revert(string);

    //checks if the round is live
    function roundLive(uint start, uint end) private {
        if(block.timestamp <= start || block.timestamp >= end){
            revert Revert("the round is not live");
        }
    }

    //only allows the admin or the presale master to call the function
    modifier onlyAdmin(){
        require(admins[_msgSender()] || _msgSender() == presaleMaster, "Not Authorized");
        _;
    }

    constructor (address _presaleMaster, address _tokenAddress, string memory _uri, address _eventhandler, address _nftAddress, address _usdc) ERC1155(_uri){
        tokenAddress = _tokenAddress;//address of the presold token
        eventhandler = _eventhandler;
        nftAddress = _nftAddress;//D3 NFT address to check ownerhip in Round 1
        usdc = _usdc;
        presaleMaster = _presaleMaster; //address of the presale master
        tokenDecimals = IERC20(_tokenAddress).decimals();
    }


    //PRESALE ROUND 1 FUNCTIONS

    //allows the user to buy a batch of LNFTs, which act as the receipts for Round 1 Buyers.
    //The function checks if a user holds a D3 NFT and allows only to mint 1 LNFT per D3 NFT.
    function buyBatchLNFT(uint amount, uint [] calldata d3IDs) external nonReentrant{
        roundLive(params1.start, params1.end);
        if(canceled){revert Revert("Presale canceled");}
        if(amount != d3IDs.length){revert Revert("amount != input array length");}
        batchOwnershipCheck(d3IDs);//checks if the user owns the D3 NFTs
        batchAllocation(d3IDs);//
        uint totalCost = amount * params1.pricePerLNFT;
       
        if(totalCost > IERC20(usdc).balanceOf(_msgSender())){revert Revert("not enough USDC");}

        (uint [] memory tokenIds, uint [] memory amounts) = _asSingletonArrays(1, amount);
        IERC20(usdc).transferFrom(_msgSender(), address(this), totalCost);
        usdcBalances[_msgSender()] += totalCost;
        _mintBatch(_msgSender(), tokenIds, amounts, "");

        allocationSize -= params1.tokensPerLNFT * amount;
        currentNFTSupply += amount;
        if(currentNFTSupply > params1.maxNFTSupply){revert Revert("not enough supply left");}

        IEventhandler(eventhandler).lNFTBought(_msgSender(), address(this), amount, totalCost);
    }

    //allows the owner of an LNFT to withdraw their tokens, which includes burning the LNFTs.
    function withdrawTokensRoundOne(uint amountLNFT) external nonReentrant{
        if(!unlocked){revert Revert("tokens are locked");}
        uint balanceLNFT = balanceOf(_msgSender(), 1);
        if(amountLNFT > balanceLNFT){revert Revert("amount exceeds your LNFT-balance");}

        (uint [] memory tokenIds, uint [] memory amounts) = _asSingletonArrays(1, amountLNFT);
        _burnBatch(_msgSender(), tokenIds, amounts);
        uint amountERC20 = amountLNFT * params1.tokensPerLNFT;
        IERC20(tokenAddress).transfer(_msgSender(), amountERC20);

        currentNFTSupply -= amountLNFT;

        IEventhandler(eventhandler).tokensWithdrawn(_msgSender(), address(this), tokenAddress, amountERC20);
    }
    
    //user that do not own a D3 NFT can buy in Round 2 and 3.. They will NOT get an LNFT as receipt.
    //Their balances are tracked seperately from Round 1 buyers.
    //The distinction between Round 2 and Round 3 is just the requirement of holding a certain amount of gatingToken
    //for Round 2 participation to
    function buyRoundTwoAndThree(uint amount, uint8 round) external nonReentrant{
        if(round != 2 && round != 3){revert Revert("wrong round input");}
        presaleChecks(amount);
        uint totalCost;
        if(round == 2){
            roundLive(params2.start, params2.end);
            //if(amount > params2.maxWallet){revert Revert();}
            if(balances[_msgSender()] + amount > params2.maxWallet){revert Revert("max wallet");}
            (uint balance, uint timestamp) = ID3Staking(params2.gatingToken).getStakingParams(_msgSender());
            if(balance < params2.gatingBalance || timestamp > params1.start){revert Revert("invalid stake");}
            //totalCost = (amount * params2.pricePerToken)/(10**18);
            totalCost = (amount * params2.pricePerToken) / 10**tokenDecimals;

            if(totalCost > IERC20(usdc).balanceOf(_msgSender())){revert Revert("not enough USDC");}

        }
        if(round == 3){
            roundLive(params3.start, params3.end);
            //if(amount > params3.maxWallet){revert Revert();}
            if(balances[_msgSender()] + amount > params3.maxWallet){revert Revert("max wallet");}
            //totalCost = (amount * params3.pricePerToken)/(10**18);
            totalCost = (amount * params3.pricePerToken) / 10**tokenDecimals;

            if(totalCost > IERC20(usdc).balanceOf(_msgSender())){revert Revert("not enough USDC");}
        }

        IERC20(usdc).transferFrom(_msgSender(), address(this), totalCost);
        usdcBalances[_msgSender()] += totalCost;

        allocationSize -= amount;
        balances[_msgSender()] += amount;

        IEventhandler(eventhandler).tokensBought(_msgSender(), address(this), tokenAddress, amount, totalCost, round);
    }

    //allows withdrawal of tokens, but unlike Round 1 buyers, this is a regular withdrawal without any burns or anything fancy.
    function withdrawTokensRoundTwoAndThree(uint amount) external nonReentrant{
        if(!unlocked){revert Revert("tokens are locked");}
        if(canceled){revert Revert("presale canceled");}
        if(amount == 0){revert Revert("entered amount 0");}
        if(balances[_msgSender()] < amount){revert Revert("insufficient presale balance");}

        balances[_msgSender()] -= amount;
        IERC20(tokenAddress).transfer(_msgSender(), amount);

        IEventhandler(eventhandler).tokensWithdrawn(_msgSender(), address(this), tokenAddress, amount);
    }


    //WITHDRAW USDC AFTER CANCELED PRESALE
   function userUSDCWithdrawal() external nonReentrant{
        if(!canceled){revert Revert("presale was not canceled");}
        uint userUSDCBalance = usdcBalances[_msgSender()];
        usdcBalances[_msgSender()] -= userUSDCBalance;
        IERC20(usdc).transfer(_msgSender(), userUSDCBalance);

        IEventhandler(eventhandler).userUSDCWithdrawal(_msgSender(), address(this), userUSDCBalance);
    }

  
    //ADMIN FUNCTIONS

    /*
        @dev params []:
        0: start round 1
        1: end round 1
        2: price Per LNFT
        3: tokens Per LNFT
        4: start round 2
        5: end round 2
        6: price Per Token round 2
        7: max Wallet
        8: gating balance required
        9: allocationSize
        10: maxNFTSupply
        11: start round 3
        12: end round 3
        13: price Per Token round 3
        14: max Wallet round 3
        15: softcap
    */
   // allows the admin to create a presale
    function createPresale(uint [] memory params, address _gatingToken) external onlyAdmin {
        if(presaleCreated){revert Revert("presale already created");}
        if(params[0] <= block.timestamp){revert Revert("presale cannot start in the past");}
        if(params[1] <= block.timestamp || params[1] <= params[0]){revert Revert("round 1 end cannot be before start");}
        if(params[1] >= params[4]){revert Revert("round 2 start cannot be before round 1 end");}
        if(params[4] >= params[5]){revert Revert("round 2 end cannot be before start");}
        if(params[5] >= params[11]){revert Revert("round 3 start cannot be before round 2 end");}
        if(params[11] >= params[12]){revert Revert("round 3 end cannot be before start");}
        if(params[3] * params[10] > params[9]){revert Revert("max LNFT supply * tokens per LNFT > allocationSize");}
        if(params[15] > params[9] * params[13]){revert Revert("softcap must be less than allocationSize * pricePerToken");}
        if(params[2] == 0 || params[3] == 0 || params[6] == 0 || params[7] == 0 || params[8] == 0 || params[9] == 0 || params[10] == 0 || params[11] == 0 || params[12] == 0 || params[13] == 0 || params[14] == 0 || params[15] == 0){revert Revert("input cannot be 0");}

        params1.start = params[0];
        params1.end = params[1];
        params1.pricePerLNFT = params[2];
        params1.tokensPerLNFT = params[3];
        params1.maxNFTSupply = params[10];

        params2.start = params[4];
        params2.end = params[5];
        params2.pricePerToken = params[6];
        params2.maxWallet = params[7];
        params2.gatingBalance = params[8];
        params2.gatingToken = _gatingToken;

        params3.start = params[11];
        params3.end = params[12];
        params3.pricePerToken = params[13];
        params3.maxWallet = params[14];

        allocationSize = params[9];
        softcap=params[15];

        IERC20(tokenAddress).transferFrom(msg.sender, address(this), params[9]);
        presaleCreated = true;

        IEventhandler(eventhandler).presaleCreated(address(this), tokenAddress, params, _gatingToken);
    }

    function movePresale(uint delay) external onlyAdmin{
        if(block.timestamp >= params1.start){revert Revert("presale already started");}
        params1.start += delay;
        params1.end += delay;
        params2.start += delay;
        params2.end += delay;
        params3.start += delay;
        params3.end += delay;

        IEventhandler(eventhandler).presaleMoved(address(this), delay);
    }

    function finalisePresale() external onlyAdmin returns(bool){
        if(block.timestamp < params3.end){revert Revert("presale has not ended");}
        if(canceled){revert Revert("presale has been canceled");}
        if(block.timestamp >= params3.end && IERC20(usdc).balanceOf(address(this)) > softcap){
            unlocked = true;
            finalised = true;
            return finalised;
        }
        if(block.timestamp > params3.end && IERC20(usdc).balanceOf(address(this)) < softcap){
            canceled = true;
            finalised = true;
            return finalised;
        }

        IEventhandler(eventhandler).presaleFinalised(address(this));
    }

    function cancelPresale() external onlyAdmin{
        if(unlocked){revert Revert("tokens are already unlocked");}
        canceled = true;

        IEventhandler(eventhandler).presaleCanceled(address(this), canceled);
    }

    function withdrawRemainingTokens(uint amount) external onlyAdmin{
        if(canceled){
            if(amount > IERC20(tokenAddress).balanceOf(address(this))){revert Revert("not enough tokens left");}
            IERC20(tokenAddress).transfer(_msgSender(), amount);
            if(amount > allocationSize){
                allocationSize = 0;
            }
            if(amount <= allocationSize){
                allocationSize -= amount;
            }
        }
        if(unlocked){
            if(amount > allocationSize){revert Revert("not enough tokens left");}
            IERC20(tokenAddress).transfer(_msgSender(), amount);
            allocationSize -= amount;

        }
    }

    function setAdmin(address admin, bool newStatus) external onlyAdmin{
        admins[admin] = newStatus;
    }

    function withdrawUSDC(uint256 amount) external onlyAdmin{
        if(block.timestamp < params3.end){revert Revert("presale has not ended yet");}
        if(!unlocked){revert Revert("tokens are not locked");}
        if(IERC20(usdc).balanceOf(address(this)) < amount){revert Revert("amount exceed contract USDC balance");}
        IERC20(usdc).transfer(_msgSender(), amount);
    }

    //HELPER FUNCTIONS
    function batchOwnershipCheck(uint [] memory d3IDs) private{
        for(uint i = 0; i < d3IDs.length; i++){
            uint id = d3IDs[i];
            address holder = IERC721(nftAddress).ownerOf(id);
            if(_msgSender() != holder){revert Revert("not the owner");}
        }
    }

    function presaleChecks(uint amount) private {
        if(canceled){revert Revert("presale is canceled");}
        if(amount > allocationSize){revert Revert("amount exceeds allocationSize");}
    }
    

    function batchAllocation(uint [] memory d3IDs) private {
        for(uint i = 0; i < d3IDs.length; i++){
            uint id = d3IDs[i];
            if(alreadyBought[id]){
                revert Revert("already bought with this ID");
            }
            else{
                alreadyBought[id] = true;
            }
        }
    }

  

    fallback()external payable{}
    receive()external payable{}
    

}
