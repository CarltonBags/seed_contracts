// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.28;

//TO DOs
// - check conditions for loops (i= 0 / 1)
// - make function to move back presale start


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

}

interface ID3Staking{
    function getStakingParams(address staker) external view returns (uint balance, uint timestamp);
}

interface IEventhandler{
    function lNFTCollectionCreated(address collection, address token, string calldata uri, address owner) external;
    function lNFTBought(address buyer, address presale, uint amountTokens, uint amountETH) external;
    function tokensBought(address buyer, address presale, address token, uint amount, uint amountETH, uint8 round) external;
    function tokensWithdrawn(address buyer, address presale, address token, uint amount) external;
    function userETHWithdrawal(address user, address presale, uint amountETH) external;
    function presaleCreated(address presale, address token, uint [] calldata params, address gatingToken) external;
    function tokenDeployed(address token, string calldata name, string calldata symbol, address mintedTo, uint mintedAmount) external;
    function setNewCaller(address caller) external;
    function presaleMoved(address presale, uint delay) external;
    function presalePaused(address presale, bool paused) external;
    function presaleCanceled(address presale, bool canceled) external;
    function tokensUnlocked(address presale, bool unlocked) external;
}

contract Presale is ERC1155 {

    mapping(address => bool) private admins;
    mapping(uint => bool) public alreadyBought; //storing which of the holders of the d3 nft have bought.
    mapping(address => uint) public balances; //storing the withdrawable presale token balance of the user.
    mapping(address => uint) public ETHBalances; //storing the amount of ETH deposited by users.
   
    address private presaleMaster;
    address private eventhandler;
    address public tokenAddress;
    uint public allocationSize;
   
    uint public currentNFTSupply;
    uint8 tokenId = 1;

    bool unlocked; //if true, tokens are withdrawable by buyers
    bool canceled; //if true, users can withdraw their deposited ETH
    bool presaleCreated; //if true, 

    address nftAddress;


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

    error PresaleNotLive();
    error NotAuthorized();
    error AlreadyBought();
    error InsufficientFunds();
    error NotEnoughAllocation();
    error Locked();
    error MaxWallet();
    error ZeroValue();
    error InvalidParam();
    error InsufficientStake();


    function roundLive(uint start, uint end) private {
        if(block.timestamp <= start || block.timestamp >= end){
            revert PresaleNotLive();
        }
    }

    function onlyAdmin() private {
        if(!admins[msg.sender]){revert NotAuthorized();}
        
    }

    function onlyOwner() private {
        if(msg.sender != presaleMaster){revert NotAuthorized();}
        
    }

    constructor (address _presaleMaster, address _tokenAddress, string memory _uri, address _eventhandler, address _nftAddress) ERC1155(_uri){
        presaleMaster = _presaleMaster;
        tokenAddress = _tokenAddress;
        admins[_presaleMaster] = true;
        eventhandler = _eventhandler;
        nftAddress = _nftAddress;
    }


    //PRESALE ROUND 1 FUNCTIONS
    /*function buySingleLNFT(uint d3ID) public nonReentrant payable{
        round1live();
        if(!presaleCreated){revert PresaleNotLive();}
        if(pause){revert PresaleNotLive();}
        if(canceled){revert PresaleNotLive();}
        if(alreadyBought[d3ID]){revert AlreadyBought();}
        address nftOwner = d3NFT.ownerOf(d3ID);
        if(nftOwner != _msgSender()){revert NotAuthorized();}
        if(params1.pricePerLNFT > msg.value){revert InsufficientFunds();}
        
        (bool success, ) = payable(address(this)).call{value: msg.value}("");
        require(success,"ETH transfer failed");
        ETHBalances[_msgSender()] = msg.value;
        alreadyBought[d3ID] = true;
        _mint(_msgSender(), tokenId, 1, "");

        allocationSize -= params1.tokensPerLNFT;

        ++currentNFTSupply;
        if(currentNFTSupply > params1.maxNFTSupply){revert NotEnoughAllocation();}

        IEventhandler(eventhandler).lNFTBought(_msgSender(), address(this), 1, msg.value);
    }*/


    function buyBatchLNFT(uint amount, uint [] calldata d3IDs) public payable{
        roundLive(params1.start, params1.end);
        if(!presaleCreated){revert PresaleNotLive();}
        if(canceled){revert PresaleNotLive();}
        if(amount != d3IDs.length){revert InsufficientFunds();}
        batchOwnershipCheck(d3IDs);
        batchAllocation(d3IDs);
        uint totalCost = amount * params1.pricePerLNFT;
        if(totalCost > msg.value){revert InsufficientFunds();}

        (uint [] memory tokenIds, uint [] memory amounts) = _asSingletonArrays(tokenId, amount);
        (bool success, ) = payable(address(this)).call{value: msg.value}("");
        require(success,"ETH transfer failed");
        ETHBalances[_msgSender()] = msg.value;
        _mintBatch(_msgSender(), tokenIds, amounts, "");

        allocationSize -= params1.tokensPerLNFT * amount;

        currentNFTSupply += amount;
        if(currentNFTSupply > params1.maxNFTSupply){revert NotEnoughAllocation();}

        IEventhandler(eventhandler).lNFTBought(_msgSender(), address(this), amount, msg.value);
    }

    function withdrawTokensRoundOne(uint amountLNFT) public {
        if(!unlocked){revert Locked();}
        uint balanceLNFT = balanceOf(_msgSender(), tokenId);
        if(amountLNFT > balanceLNFT){revert InsufficientFunds();}

        (uint [] memory tokenIds, uint [] memory amounts) = _asSingletonArrays(tokenId, amountLNFT);
        _burnBatch(_msgSender(), tokenIds, amounts);
        uint amountERC20 = balanceLNFT * params1.tokensPerLNFT;
        IERC20(tokenAddress).transfer(_msgSender(), amountERC20);

        currentNFTSupply -= amountLNFT;

        IEventhandler(eventhandler).tokensWithdrawn(_msgSender(), address(this), tokenAddress, amountERC20);
    }
    

    function buyRoundTwoAndThree(uint amount, uint8 round) public payable {
        if(round != 2 && round != 3){revert InvalidParam();}
        presaleChecks(amount);
        uint totalCost;
        if(round == 2){
            roundLive(params2.start, params2.end);
            if(amount > params2.maxWallet){revert MaxWallet();}
            if(balances[_msgSender()] + amount > params2.maxWallet){revert MaxWallet();}
            (uint balance, uint timestamp) = ID3Staking(params2.gatingToken).getStakingParams(_msgSender());
            if(balance < params2.gatingBalance || timestamp > params1.start){revert InsufficientStake();}
            totalCost = (amount * params2.pricePerToken)/(10**18);
            if(totalCost > msg.value){revert InsufficientFunds();}

        }
        if(round == 3){
            roundLive(params3.start, params3.end);
            if(amount > params3.maxWallet){revert MaxWallet();}
            if(balances[_msgSender()] + amount > params3.maxWallet){revert MaxWallet();}
            totalCost = (amount * params3.pricePerToken)/(10**18);
            if(totalCost > msg.value){revert InsufficientFunds();}
        }

        (bool success, ) = payable(address(this)).call{value: msg.value}("");
        require(success,"ETH transfer failed");
        ETHBalances[_msgSender()] = msg.value;

        allocationSize -= amount;
        balances[_msgSender()] += amount;

        IEventhandler(eventhandler).tokensBought(_msgSender(), address(this), tokenAddress, amount, msg.value, round);
    }


    function withdrawTokensRoundTwoAndThree(uint amount) external {
        if(!unlocked){revert Locked();}
        if(amount == 0){revert ZeroValue();}
        if(balances[_msgSender()] < amount){revert InsufficientFunds();}

        balances[_msgSender()] -= amount;
        IERC20(tokenAddress).transfer(_msgSender(), amount);

        IEventhandler(eventhandler).tokensWithdrawn(_msgSender(), address(this), tokenAddress, amount);
    }

    //HELPER FUNCTIONS
    function batchOwnershipCheck(uint [] memory d3IDs) private{
        for(uint i = 0; i < d3IDs.length; i++){
            uint id = d3IDs[i];
            address holder = IERC721(nftAddress).ownerOf(id);
            if(_msgSender() != holder){revert InsufficientFunds();}
        }
    }

    function presaleChecks(uint amount) internal {
        if(!presaleCreated){revert PresaleNotLive();}
        if(canceled){revert PresaleNotLive();}
        if(amount > allocationSize){revert NotEnoughAllocation();}
    }
    

    /*function ownershipCheck(uint d3ID) public view returns (address) {
        address holder = IERC721(nftAddress).ownerOf(d3ID);
        if(_msgSender() != holder){revert InsufficientFunds();}

    }*/

    function batchAllocation(uint [] memory d3IDs) private {
        for(uint i = 0; i < d3IDs.length; i++){
            uint id = d3IDs[i];
            if(alreadyBought[id]){
                revert AlreadyBought();
            }
            else{
                alreadyBought[id] = true;
            }
        }
    }

    //WITHDRAW ETH AFTER CANCELED PRESALE
   function userETHWithdrawal() external payable{
        if(canceled){
            uint userETHBalance = ETHBalances[_msgSender()];
            ETHBalances[_msgSender()] -= userETHBalance;
            (bool success, ) = payable(_msgSender()).call{value: userETHBalance}("");
            require(success, "ETH transfer failed");
        }

        IEventhandler(eventhandler).userETHWithdrawal(_msgSender(), address(this), msg.value);
    }


    //OWNER FUNCTIONS
    function setAdmin(address admin, bool newStatus) external{
        onlyOwner();
        admins[admin] = newStatus;
    }

    function withdrawETH(uint256 amountETH) external {
        onlyOwner();
        if(address(this).balance < amountETH){revert InsufficientFunds();}
        (bool success, ) = payable(_msgSender()).call{value: amountETH}("");
        require(success, "withdrawal failed");
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
    
    */

    function createPresale(uint [] memory params, address _gatingToken) external  {
        onlyAdmin();
        if(params[0] <= block.timestamp){revert InvalidParam();}
        if(params[1] <= block.timestamp || params[1] <= params[0]){revert InvalidParam();}
        if(params[1] >= params[4]){revert InvalidParam();}
        if(params[4] >= params[5]){revert InvalidParam();}
        if(params[5] >= params[11]){revert InvalidParam();}
        if(params[11] >= params[12]){revert InvalidParam();}
        if(params[2] == 0 || params[3] == 0 || params[6] == 0 || params[7] == 0 || params[8] == 0 || params[9] == 0 || params[10] == 0 || params[11] == 0 || params[12] == 0 || params[13] == 0 || params[14] == 0){revert ZeroValue();}

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

        IERC20(tokenAddress).transferFrom(msg.sender, address(this), params[9]);
        presaleCreated = true;

        IEventhandler(eventhandler).presaleCreated(address(this), tokenAddress, params, _gatingToken);
    }

    function movePresale(uint delay) external {
        onlyAdmin();
        if(block.timestamp >= params1.start){revert NotAuthorized();}
        params1.start += delay;
        params1.end += delay;
        params2.start += delay;
        params2.end += delay;
        params3.start += delay;
        params3.end += delay;

        IEventhandler(eventhandler).presaleMoved(address(this), delay);
    }


    function releaseTokens(bool _unlocked) external {
        onlyAdmin();
        if(block.timestamp < params3.end){revert NotAuthorized();}
        unlocked = _unlocked;

        IEventhandler(eventhandler).tokensUnlocked(address(this), _unlocked);
    }

    function cancelPresale(bool _canceled) external {
        onlyAdmin();
        canceled = _canceled;

        IEventhandler(eventhandler).presaleCanceled(address(this), _canceled);
    }

    function withdrawRemainingTokens(uint amount) external {
        onlyAdmin();
        if(block.timestamp < params3.end){revert Locked();}
        if(amount > allocationSize){revert NotEnoughAllocation();}
        IERC20(tokenAddress).transfer(_msgSender(), amount);
    }

    fallback()external payable{}
    receive()external payable{}
    


}
