// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTVerseToken is ERC721URIStorage, Ownable {
    uint256 public tokenCount;

    constructor() ERC721("NFTVerse", "NFTV") {}

    function mint(address to, string memory tokenURI) public returns (uint256) {
        tokenCount += 1;
        uint256 tokenId = tokenCount;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }
}
