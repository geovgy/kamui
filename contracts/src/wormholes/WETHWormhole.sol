// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IKamui} from "../interfaces/IKamui.sol";
import {Wormhole} from "../Wormhole.sol";

contract WETHWormhole is ERC20, Wormhole {
    uint256 private _supply;

    event  Deposit(address indexed to, uint256 amount);
    event  Withdrawal(address indexed from, uint256 amount);

    error WithdrawalFailed();

    constructor(IKamui kamui_) ERC20("Wormhole Wrapped Ether", "whWETH") Wormhole(kamui_) {}

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) public {
        _burn(msg.sender, amount);
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert WithdrawalFailed();
        }
        emit Withdrawal(msg.sender, amount);
    }

    function _initialize(bytes calldata data_) internal view override returns (bool) {
        require(!initialized, "WETHWormhole: already initialized");
        require(data_.length == 0, "WETHWormhole: data is not empty");
        return true;
    }

    function _unshield(address to, uint256 /* id */, uint256 amount) internal override {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        super._update(from, to, value);
        _requestWormholeEntry(from, to, 0, value); // id is always 0 for ERC20 tokens
    }

    function actualSupply() public view override returns (uint256) {
        return _supply;
    }
}