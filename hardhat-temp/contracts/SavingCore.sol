// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IVaultManager.sol";

/// @title SavingCore
/// @notice Term-deposit logic. Holds user principal, mints ERC721 deposit certificates,
///         and pays interest from a separate VaultManager. APR/penalty are snapshotted per deposit.
contract SavingCore is ERC721, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_APR_BPS = 10000;
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant GRACE_PERIOD = 3 days; // personal variant: (1 mod 3)+2 = 3 days

    IERC20 public immutable usdc;
    IVaultManager public immutable vault;

    struct Plan {
        uint256 tenorDays;
        uint256 aprBps;
        uint256 minDeposit;
        uint256 maxDeposit;
        uint256 earlyWithdrawPenaltyBps;
        bool enabled;
    }

    enum DepositStatus { Active, Withdrawn, ManualRenewed, AutoRenewed }

    struct Deposit {
        uint256 planId;
        uint256 principal;
        uint256 startAt;
        uint256 maturityAt;
        uint256 aprBpsAtOpen;
        uint256 penaltyBpsAtOpen;
        uint256 tenorDaysAtOpen;
        DepositStatus status;
        uint256 pendingInterest;
    }

    Plan[] private _plans;
    mapping(uint256 => Deposit) public deposits;
    uint256 public nextDepositId;
    uint256 public keeperRewardBps; // bonus G: paid from vault on top of interest

    event PlanCreated(uint256 planId, uint256 tenorDays, uint256 aprBps);
    event PlanUpdated(uint256 planId, uint256 newAprBps);
    event PlanEnabled(uint256 planId);
    event PlanDisabled(uint256 planId);
    event KeeperRewardUpdated(uint256 bps);
    event DepositOpened(uint256 depositId, address owner, uint256 planId, uint256 principal, uint256 maturityAt, uint256 aprBpsAtOpen);
    event Withdrawn(uint256 depositId, address owner, uint256 principal, uint256 interest, bool isEarly);
    event Renewed(uint256 oldDepositId, uint256 newDepositId, uint256 newPrincipal, uint256 newPlanId);
    event InterestClaimed(uint256 depositId, address owner, uint256 amount);
    event KeeperRewardPaid(uint256 depositId, address keeper, uint256 amount);

    constructor(address _usdc, address _vault)
        ERC721("Saving Deposit Certificate", "SDC")
        Ownable(msg.sender)
    {
        require(_usdc != address(0) && _vault != address(0), "zero addr");
        usdc = IERC20(_usdc);
        vault = IVaultManager(_vault);
    }

    // ----- Plan management -----

    function createPlan(
        uint256 tenorDays,
        uint256 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 penaltyBps
    ) external onlyOwner returns (uint256 planId) {
        require(tenorDays > 0, "bad tenor");
        require(aprBps > 0 && aprBps <= MAX_APR_BPS, "bad apr");
        require(penaltyBps <= BPS_DENOMINATOR, "bad penalty");
        if (minDeposit > 0 && maxDeposit > 0) {
            require(maxDeposit >= minDeposit, "bad limits");
        }
        planId = _plans.length;
        _plans.push(Plan(tenorDays, aprBps, minDeposit, maxDeposit, penaltyBps, true));
        emit PlanCreated(planId, tenorDays, aprBps);
    }

    function updatePlan(uint256 planId, uint256 newAprBps) external onlyOwner {
        require(planId < _plans.length, "no plan");
        require(newAprBps > 0 && newAprBps <= MAX_APR_BPS, "bad apr");
        _plans[planId].aprBps = newAprBps;
        emit PlanUpdated(planId, newAprBps);
    }

    function enablePlan(uint256 planId) external onlyOwner {
        require(planId < _plans.length, "no plan");
        _plans[planId].enabled = true;
        emit PlanEnabled(planId);
    }

    function disablePlan(uint256 planId) external onlyOwner {
        require(planId < _plans.length, "no plan");
        _plans[planId].enabled = false;
        emit PlanDisabled(planId);
    }

    function setKeeperRewardBps(uint256 bps) external onlyOwner {
        require(bps <= BPS_DENOMINATOR, "bad bps");
        keeperRewardBps = bps;
        emit KeeperRewardUpdated(bps);
    }

    function plans(uint256 planId) external view returns (Plan memory) {
        require(planId < _plans.length, "no plan");
        return _plans[planId];
    }

    function planCount() external view returns (uint256) {
        return _plans.length;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
