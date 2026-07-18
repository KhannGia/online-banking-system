import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MockUSDC
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const mockUsdcAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'error',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'allowance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC20InsufficientAllowance',
  },
  {
    type: 'error',
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC20InsufficientBalance',
  },
  {
    type: 'error',
    inputs: [{ name: 'approver', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidApprover',
  },
  {
    type: 'error',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidReceiver',
  },
  {
    type: 'error',
    inputs: [{ name: 'sender', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidSender',
  },
  {
    type: 'error',
    inputs: [{ name: 'spender', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidSpender',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'spender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'spender', internalType: 'address', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const mockUsdcAddress = {
  31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  11155111: '0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd',
} as const

/**
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const mockUsdcConfig = {
  address: mockUsdcAddress,
  abi: mockUsdcAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SavingCore
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const savingCoreAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_usdc', internalType: 'address', type: 'address' },
      { name: '_vault', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    name: 'ERC721IncorrectOwner',
  },
  {
    type: 'error',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC721InsufficientApproval',
  },
  {
    type: 'error',
    inputs: [{ name: 'approver', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidApprover',
  },
  {
    type: 'error',
    inputs: [{ name: 'operator', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidOperator',
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidReceiver',
  },
  {
    type: 'error',
    inputs: [{ name: 'sender', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidSender',
  },
  {
    type: 'error',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ERC721NonexistentToken',
  },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'approved',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'approved', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'ApprovalForAll',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'depositId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'planId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'principal',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'maturityAt',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'aprBpsAtOpen',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DepositOpened',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'depositId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'InterestClaimed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'depositId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'keeper',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'KeeperRewardPaid',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'bps', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'KeeperRewardUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Paused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'planId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'tenorDays',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'aprBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'PlanCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'planId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'PlanDisabled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'planId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'PlanEnabled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'planId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newAprBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'PlanUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldDepositId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newDepositId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newPrincipal',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newPlanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Renewed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Unpaused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'depositId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'principal',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'interest',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'isEarly', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'Withdrawn',
  },
  {
    type: 'function',
    inputs: [],
    name: 'BPS_DENOMINATOR',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'GRACE_PERIOD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_APR_BPS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'SECONDS_PER_DAY',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'SECONDS_PER_YEAR',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'depositId', internalType: 'uint256', type: 'uint256' }],
    name: 'autoRenewDeposit',
    outputs: [
      { name: 'newDepositId', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'depositId', internalType: 'uint256', type: 'uint256' }],
    name: 'claimInterest',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tenorDays', internalType: 'uint256', type: 'uint256' },
      { name: 'aprBps', internalType: 'uint256', type: 'uint256' },
      { name: 'minDeposit', internalType: 'uint256', type: 'uint256' },
      { name: 'maxDeposit', internalType: 'uint256', type: 'uint256' },
      { name: 'penaltyBps', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'createPlan',
    outputs: [{ name: 'planId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'deposits',
    outputs: [
      { name: 'planId', internalType: 'uint256', type: 'uint256' },
      { name: 'principal', internalType: 'uint256', type: 'uint256' },
      { name: 'startAt', internalType: 'uint256', type: 'uint256' },
      { name: 'maturityAt', internalType: 'uint256', type: 'uint256' },
      { name: 'aprBpsAtOpen', internalType: 'uint256', type: 'uint256' },
      { name: 'penaltyBpsAtOpen', internalType: 'uint256', type: 'uint256' },
      { name: 'tenorDaysAtOpen', internalType: 'uint256', type: 'uint256' },
      {
        name: 'status',
        internalType: 'enum SavingCore.DepositStatus',
        type: 'uint8',
      },
      { name: 'pendingInterest', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'planId', internalType: 'uint256', type: 'uint256' }],
    name: 'disablePlan',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'depositId', internalType: 'uint256', type: 'uint256' }],
    name: 'earlyWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'planId', internalType: 'uint256', type: 'uint256' }],
    name: 'enablePlan',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'operator', internalType: 'address', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'keeperRewardBps',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextDepositId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'planId', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'openDeposit',
    outputs: [{ name: 'depositId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'planCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'planId', internalType: 'uint256', type: 'uint256' }],
    name: 'plans',
    outputs: [
      {
        name: '',
        internalType: 'struct SavingCore.Plan',
        type: 'tuple',
        components: [
          { name: 'tenorDays', internalType: 'uint256', type: 'uint256' },
          { name: 'aprBps', internalType: 'uint256', type: 'uint256' },
          { name: 'minDeposit', internalType: 'uint256', type: 'uint256' },
          { name: 'maxDeposit', internalType: 'uint256', type: 'uint256' },
          {
            name: 'earlyWithdrawPenaltyBps',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'enabled', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'depositId', internalType: 'uint256', type: 'uint256' }],
    name: 'previewInterest',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'depositId', internalType: 'uint256', type: 'uint256' },
      { name: 'newPlanId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'renewDeposit',
    outputs: [
      { name: 'newDepositId', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'bps', internalType: 'uint256', type: 'uint256' }],
    name: 'setKeeperRewardBps',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'planId', internalType: 'uint256', type: 'uint256' },
      { name: 'newAprBps', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updatePlan',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'usdc',
    outputs: [{ name: '', internalType: 'contract IERC20', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'vault',
    outputs: [
      { name: '', internalType: 'contract IVaultManager', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'depositId', internalType: 'uint256', type: 'uint256' }],
    name: 'withdrawAtMaturity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const savingCoreAddress = {
  31337: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  11155111: '0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c',
} as const

/**
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const savingCoreConfig = {
  address: savingCoreAddress,
  abi: savingCoreAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// VaultManager
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const vaultManagerAbi = [
  {
    type: 'constructor',
    inputs: [{ name: '_usdc', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'receiver',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'FeeReceiverUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Funded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'to', internalType: 'address', type: 'address', indexed: false },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'InterestPaid',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Paused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'core',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SavingCoreSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Unpaused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [],
    name: 'VaultWithdrawCancelled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VaultWithdrawExecuted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'executeAfter',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VaultWithdrawScheduled',
  },
  {
    type: 'function',
    inputs: [],
    name: 'TIMELOCK_DELAY',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'cancelScheduledWithdrawal',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'executeWithdrawVault',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'feeReceiver',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'amount', internalType: 'uint256', type: 'uint256' }],
    name: 'fundVault',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'payInterest',
    outputs: [{ name: 'paid', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pendingWithdrawAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'savingCore',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'amount', internalType: 'uint256', type: 'uint256' }],
    name: 'scheduleWithdrawVault',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_receiver', internalType: 'address', type: 'address' }],
    name: 'setFeeReceiver',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_core', internalType: 'address', type: 'address' }],
    name: 'setSavingCore',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'usdc',
    outputs: [{ name: '', internalType: 'contract IERC20', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'vaultBalance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'withdrawExecutableAt',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

/**
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const vaultManagerAddress = {
  31337: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  11155111: '0xe7350f158BCDdCA8E9124D229FA09286B90B1A82',
} as const

/**
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const vaultManagerConfig = {
  address: vaultManagerAddress,
  abi: vaultManagerAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link mockUsdcAbi}__
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useReadMockUsdc = /*#__PURE__*/ createUseReadContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"allowance"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useReadMockUsdcAllowance = /*#__PURE__*/ createUseReadContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
  functionName: 'allowance',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"balanceOf"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useReadMockUsdcBalanceOf = /*#__PURE__*/ createUseReadContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"decimals"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useReadMockUsdcDecimals = /*#__PURE__*/ createUseReadContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
  functionName: 'decimals',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"name"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useReadMockUsdcName = /*#__PURE__*/ createUseReadContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"symbol"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useReadMockUsdcSymbol = /*#__PURE__*/ createUseReadContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"totalSupply"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useReadMockUsdcTotalSupply = /*#__PURE__*/ createUseReadContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
  functionName: 'totalSupply',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link mockUsdcAbi}__
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useWriteMockUsdc = /*#__PURE__*/ createUseWriteContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"approve"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useWriteMockUsdcApprove = /*#__PURE__*/ createUseWriteContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
  functionName: 'approve',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"mint"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useWriteMockUsdcMint = /*#__PURE__*/ createUseWriteContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
  functionName: 'mint',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"transfer"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useWriteMockUsdcTransfer = /*#__PURE__*/ createUseWriteContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
  functionName: 'transfer',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"transferFrom"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useWriteMockUsdcTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: mockUsdcAbi,
    address: mockUsdcAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link mockUsdcAbi}__
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useSimulateMockUsdc = /*#__PURE__*/ createUseSimulateContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"approve"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useSimulateMockUsdcApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: mockUsdcAbi,
    address: mockUsdcAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"mint"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useSimulateMockUsdcMint = /*#__PURE__*/ createUseSimulateContract({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
  functionName: 'mint',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"transfer"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useSimulateMockUsdcTransfer =
  /*#__PURE__*/ createUseSimulateContract({
    abi: mockUsdcAbi,
    address: mockUsdcAddress,
    functionName: 'transfer',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link mockUsdcAbi}__ and `functionName` set to `"transferFrom"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useSimulateMockUsdcTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: mockUsdcAbi,
    address: mockUsdcAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link mockUsdcAbi}__
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useWatchMockUsdcEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: mockUsdcAbi,
  address: mockUsdcAddress,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link mockUsdcAbi}__ and `eventName` set to `"Approval"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useWatchMockUsdcApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: mockUsdcAbi,
    address: mockUsdcAddress,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link mockUsdcAbi}__ and `eventName` set to `"Transfer"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6AF827562ba95b8A3A4FFE743D88Df1532BB9aFd)
 */
export const useWatchMockUsdcTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: mockUsdcAbi,
    address: mockUsdcAddress,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCore = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"BPS_DENOMINATOR"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreBpsDenominator =
  /*#__PURE__*/ createUseReadContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'BPS_DENOMINATOR',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"GRACE_PERIOD"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreGracePeriod = /*#__PURE__*/ createUseReadContract(
  {
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'GRACE_PERIOD',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"MAX_APR_BPS"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreMaxAprBps = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'MAX_APR_BPS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"SECONDS_PER_DAY"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreSecondsPerDay =
  /*#__PURE__*/ createUseReadContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'SECONDS_PER_DAY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"SECONDS_PER_YEAR"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreSecondsPerYear =
  /*#__PURE__*/ createUseReadContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'SECONDS_PER_YEAR',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"balanceOf"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreBalanceOf = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"deposits"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreDeposits = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'deposits',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"getApproved"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreGetApproved = /*#__PURE__*/ createUseReadContract(
  {
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'getApproved',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"isApprovedForAll"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"keeperRewardBps"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreKeeperRewardBps =
  /*#__PURE__*/ createUseReadContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'keeperRewardBps',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"name"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreName = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"nextDepositId"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreNextDepositId =
  /*#__PURE__*/ createUseReadContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'nextDepositId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"owner"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreOwner = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"ownerOf"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreOwnerOf = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'ownerOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"paused"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCorePaused = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'paused',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"planCount"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCorePlanCount = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'planCount',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"plans"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCorePlans = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'plans',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"previewInterest"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCorePreviewInterest =
  /*#__PURE__*/ createUseReadContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'previewInterest',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"symbol"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreSymbol = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"tokenURI"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreTokenUri = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'tokenURI',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"usdc"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreUsdc = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'usdc',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"vault"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useReadSavingCoreVault = /*#__PURE__*/ createUseReadContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'vault',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCore = /*#__PURE__*/ createUseWriteContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"approve"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreApprove = /*#__PURE__*/ createUseWriteContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'approve',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"autoRenewDeposit"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreAutoRenewDeposit =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'autoRenewDeposit',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"claimInterest"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreClaimInterest =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'claimInterest',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"createPlan"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreCreatePlan =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'createPlan',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"disablePlan"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreDisablePlan =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'disablePlan',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"earlyWithdraw"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreEarlyWithdraw =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'earlyWithdraw',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"enablePlan"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreEnablePlan =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'enablePlan',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"openDeposit"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreOpenDeposit =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'openDeposit',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"pause"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCorePause = /*#__PURE__*/ createUseWriteContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'pause',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"renewDeposit"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreRenewDeposit =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'renewDeposit',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreSafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreSetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"setKeeperRewardBps"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreSetKeeperRewardBps =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'setKeeperRewardBps',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"transferFrom"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"unpause"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreUnpause = /*#__PURE__*/ createUseWriteContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
  functionName: 'unpause',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"updatePlan"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreUpdatePlan =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'updatePlan',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"withdrawAtMaturity"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWriteSavingCoreWithdrawAtMaturity =
  /*#__PURE__*/ createUseWriteContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'withdrawAtMaturity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCore = /*#__PURE__*/ createUseSimulateContract({
  abi: savingCoreAbi,
  address: savingCoreAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"approve"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"autoRenewDeposit"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreAutoRenewDeposit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'autoRenewDeposit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"claimInterest"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreClaimInterest =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'claimInterest',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"createPlan"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreCreatePlan =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'createPlan',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"disablePlan"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreDisablePlan =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'disablePlan',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"earlyWithdraw"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreEarlyWithdraw =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'earlyWithdraw',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"enablePlan"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreEnablePlan =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'enablePlan',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"openDeposit"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreOpenDeposit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'openDeposit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"pause"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCorePause =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'pause',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"renewDeposit"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreRenewDeposit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'renewDeposit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreSafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreSetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"setKeeperRewardBps"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreSetKeeperRewardBps =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'setKeeperRewardBps',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"transferFrom"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"unpause"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreUnpause =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'unpause',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"updatePlan"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreUpdatePlan =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'updatePlan',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link savingCoreAbi}__ and `functionName` set to `"withdrawAtMaturity"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useSimulateSavingCoreWithdrawAtMaturity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    functionName: 'withdrawAtMaturity',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCoreEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"Approval"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCoreApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"ApprovalForAll"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCoreApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"DepositOpened"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCoreDepositOpenedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'DepositOpened',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"InterestClaimed"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCoreInterestClaimedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'InterestClaimed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"KeeperRewardPaid"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCoreKeeperRewardPaidEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'KeeperRewardPaid',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"KeeperRewardUpdated"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCoreKeeperRewardUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'KeeperRewardUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCoreOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"Paused"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCorePausedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'Paused',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"PlanCreated"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCorePlanCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'PlanCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"PlanDisabled"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCorePlanDisabledEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'PlanDisabled',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"PlanEnabled"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCorePlanEnabledEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'PlanEnabled',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"PlanUpdated"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCorePlanUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'PlanUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"Renewed"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCoreRenewedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'Renewed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"Transfer"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCoreTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"Unpaused"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCoreUnpausedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'Unpaused',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link savingCoreAbi}__ and `eventName` set to `"Withdrawn"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc4D8e5F7f913480aBAd831BaD9a46aEc679e351c)
 */
export const useWatchSavingCoreWithdrawnEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: savingCoreAbi,
    address: savingCoreAddress,
    eventName: 'Withdrawn',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link vaultManagerAbi}__
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useReadVaultManager = /*#__PURE__*/ createUseReadContract({
  abi: vaultManagerAbi,
  address: vaultManagerAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"TIMELOCK_DELAY"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useReadVaultManagerTimelockDelay =
  /*#__PURE__*/ createUseReadContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'TIMELOCK_DELAY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"feeReceiver"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useReadVaultManagerFeeReceiver =
  /*#__PURE__*/ createUseReadContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'feeReceiver',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"owner"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useReadVaultManagerOwner = /*#__PURE__*/ createUseReadContract({
  abi: vaultManagerAbi,
  address: vaultManagerAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"paused"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useReadVaultManagerPaused = /*#__PURE__*/ createUseReadContract({
  abi: vaultManagerAbi,
  address: vaultManagerAddress,
  functionName: 'paused',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"pendingWithdrawAmount"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useReadVaultManagerPendingWithdrawAmount =
  /*#__PURE__*/ createUseReadContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'pendingWithdrawAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"savingCore"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useReadVaultManagerSavingCore =
  /*#__PURE__*/ createUseReadContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'savingCore',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"usdc"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useReadVaultManagerUsdc = /*#__PURE__*/ createUseReadContract({
  abi: vaultManagerAbi,
  address: vaultManagerAddress,
  functionName: 'usdc',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"vaultBalance"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useReadVaultManagerVaultBalance =
  /*#__PURE__*/ createUseReadContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'vaultBalance',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"withdrawExecutableAt"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useReadVaultManagerWithdrawExecutableAt =
  /*#__PURE__*/ createUseReadContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'withdrawExecutableAt',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link vaultManagerAbi}__
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWriteVaultManager = /*#__PURE__*/ createUseWriteContract({
  abi: vaultManagerAbi,
  address: vaultManagerAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"cancelScheduledWithdrawal"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWriteVaultManagerCancelScheduledWithdrawal =
  /*#__PURE__*/ createUseWriteContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'cancelScheduledWithdrawal',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"executeWithdrawVault"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWriteVaultManagerExecuteWithdrawVault =
  /*#__PURE__*/ createUseWriteContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'executeWithdrawVault',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"fundVault"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWriteVaultManagerFundVault =
  /*#__PURE__*/ createUseWriteContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'fundVault',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"pause"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWriteVaultManagerPause = /*#__PURE__*/ createUseWriteContract({
  abi: vaultManagerAbi,
  address: vaultManagerAddress,
  functionName: 'pause',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"payInterest"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWriteVaultManagerPayInterest =
  /*#__PURE__*/ createUseWriteContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'payInterest',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWriteVaultManagerRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"scheduleWithdrawVault"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWriteVaultManagerScheduleWithdrawVault =
  /*#__PURE__*/ createUseWriteContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'scheduleWithdrawVault',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"setFeeReceiver"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWriteVaultManagerSetFeeReceiver =
  /*#__PURE__*/ createUseWriteContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'setFeeReceiver',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"setSavingCore"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWriteVaultManagerSetSavingCore =
  /*#__PURE__*/ createUseWriteContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'setSavingCore',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWriteVaultManagerTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"unpause"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWriteVaultManagerUnpause = /*#__PURE__*/ createUseWriteContract(
  {
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'unpause',
  },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link vaultManagerAbi}__
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useSimulateVaultManager = /*#__PURE__*/ createUseSimulateContract({
  abi: vaultManagerAbi,
  address: vaultManagerAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"cancelScheduledWithdrawal"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useSimulateVaultManagerCancelScheduledWithdrawal =
  /*#__PURE__*/ createUseSimulateContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'cancelScheduledWithdrawal',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"executeWithdrawVault"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useSimulateVaultManagerExecuteWithdrawVault =
  /*#__PURE__*/ createUseSimulateContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'executeWithdrawVault',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"fundVault"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useSimulateVaultManagerFundVault =
  /*#__PURE__*/ createUseSimulateContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'fundVault',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"pause"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useSimulateVaultManagerPause =
  /*#__PURE__*/ createUseSimulateContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'pause',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"payInterest"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useSimulateVaultManagerPayInterest =
  /*#__PURE__*/ createUseSimulateContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'payInterest',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useSimulateVaultManagerRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"scheduleWithdrawVault"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useSimulateVaultManagerScheduleWithdrawVault =
  /*#__PURE__*/ createUseSimulateContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'scheduleWithdrawVault',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"setFeeReceiver"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useSimulateVaultManagerSetFeeReceiver =
  /*#__PURE__*/ createUseSimulateContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'setFeeReceiver',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"setSavingCore"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useSimulateVaultManagerSetSavingCore =
  /*#__PURE__*/ createUseSimulateContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'setSavingCore',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useSimulateVaultManagerTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link vaultManagerAbi}__ and `functionName` set to `"unpause"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useSimulateVaultManagerUnpause =
  /*#__PURE__*/ createUseSimulateContract({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    functionName: 'unpause',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link vaultManagerAbi}__
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWatchVaultManagerEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link vaultManagerAbi}__ and `eventName` set to `"FeeReceiverUpdated"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWatchVaultManagerFeeReceiverUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    eventName: 'FeeReceiverUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link vaultManagerAbi}__ and `eventName` set to `"Funded"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWatchVaultManagerFundedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    eventName: 'Funded',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link vaultManagerAbi}__ and `eventName` set to `"InterestPaid"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWatchVaultManagerInterestPaidEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    eventName: 'InterestPaid',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link vaultManagerAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWatchVaultManagerOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link vaultManagerAbi}__ and `eventName` set to `"Paused"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWatchVaultManagerPausedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    eventName: 'Paused',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link vaultManagerAbi}__ and `eventName` set to `"SavingCoreSet"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWatchVaultManagerSavingCoreSetEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    eventName: 'SavingCoreSet',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link vaultManagerAbi}__ and `eventName` set to `"Unpaused"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWatchVaultManagerUnpausedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    eventName: 'Unpaused',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link vaultManagerAbi}__ and `eventName` set to `"VaultWithdrawCancelled"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWatchVaultManagerVaultWithdrawCancelledEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    eventName: 'VaultWithdrawCancelled',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link vaultManagerAbi}__ and `eventName` set to `"VaultWithdrawExecuted"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWatchVaultManagerVaultWithdrawExecutedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    eventName: 'VaultWithdrawExecuted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link vaultManagerAbi}__ and `eventName` set to `"VaultWithdrawScheduled"`
 *
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xe7350f158BCDdCA8E9124D229FA09286B90B1A82)
 */
export const useWatchVaultManagerVaultWithdrawScheduledEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: vaultManagerAbi,
    address: vaultManagerAddress,
    eventName: 'VaultWithdrawScheduled',
  })
