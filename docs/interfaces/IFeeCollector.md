# IFeeCollector

A smart contract for registering vaults for payments.

## Functions

### registerVault

```solidity
function registerVault(
    address owner,
    address token,
    bool multiplePayments,
    uint120 fee
) external
```

Registers a vault and it's fee.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `owner` | address | The address that receives the fees from the payment. |
| `token` | address | The zero address for Ether, otherwise an ERC20 token. |
| `multiplePayments` | bool | Whether the fee can be paid multiple times. |
| `fee` | uint120 | The amount of fee to pay in base units. |

### payFee

```solidity
function payFee(
    uint256 vaultId
) external
```

Registers the paid fee, both in Ether or ERC20.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 | The id of the vault to pay to. |

### setGuildFeeCollector

```solidity
function setGuildFeeCollector(
    address payable newFeeCollector
) external
```

Sets the address that receives Guild's share from the funds.

Callable only by the current Guild fee collector.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `newFeeCollector` | address payable | The new address of guildFeeCollector. |

### setGuildShareBps

```solidity
function setGuildShareBps(
    uint96 newShare
) external
```

Sets Guild's share from the funds.

Callable only by the Guild fee collector.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `newShare` | uint96 | The percentual value expressed in basis points. |

### setVaultDetails

```solidity
function setVaultDetails(
    uint256 vaultId,
    address newOwner,
    bool newMultiplePayments,
    uint120 newFee
) external
```

Changes the details of a vault.

Callable only by the owner of the vault to be changed.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 | The id of the vault whose details should be changed. |
| `newOwner` | address | The address that will receive the fees from now on. |
| `newMultiplePayments` | bool | Whether the fee can be paid multiple times from now on. |
| `newFee` | uint120 | The amount of fee to pay in base units from now on. |

### withdraw

```solidity
function withdraw(
    uint256 vaultId
) external
```

Distributes the funds from a vault to the fee collectors and the owner.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 | The id of the vault whose funds should be distributed. |

### getVault

```solidity
function getVault(
    uint256 vaultId
) external returns (address owner, address token, bool multiplePayments, uint120 fee, uint128 collected)
```

Returns a vault's details.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 | The id of the queried vault. |

#### Return Values

| Name | Type | Description |
| :--- | :--- | :---------- |
| `owner` | address | The owner of the vault who recieves the funds. |
| `token` | address | The address of the token to receive funds in (the zero address in case of Ether). |
| `multiplePayments` | bool | Whether the fee can be paid multiple times. |
| `fee` | uint120 | The amount of required funds in base units. |
| `collected` | uint128 | The amount of already collected funds. |
### hasPaid

```solidity
function hasPaid(
    uint256 vaultId,
    address account
) external returns (bool paid)
```

Returns if an account has paid the fee to a vault.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 | The id of the queried vault. |
| `account` | address | The address of the queried account. |

### guildFeeCollector

```solidity
function guildFeeCollector() external returns (address payable)
```

Returns the address that receives Guild's share from the funds.

### guildShareBps

```solidity
function guildShareBps() external returns (uint96)
```

Returns the percentage of Guild's share expressed in basis points.

## Events

### FeeReceived

```solidity
event FeeReceived(
    uint256 vaultId,
    address account,
    uint256 amount
)
```

Event emitted when a call to {payFee} succeeds.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 | The id of the vault that received the payment. |
| `account` | address | The address of the account that paid. |
| `amount` | uint256 | The amount of fee received in base units. |
### GuildFeeCollectorChanged

```solidity
event GuildFeeCollectorChanged(
    address newFeeCollector
)
```

Event emitted when the Guild fee collector address is changed.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `newFeeCollector` | address | The address to change guildFeeCollector to. |
### GuildShareBpsChanged

```solidity
event GuildShareBpsChanged(
    uint96 newShare
)
```

Event emitted when the share of the Guild fee collector changes.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `newShare` | uint96 | The new value of guildShareBps. |
### VaultDetailsChanged

```solidity
event VaultDetailsChanged(
    uint256 vaultId
)
```

Event emitted when a vault's details are changed.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 | The id of the altered vault. |
### VaultRegistered

```solidity
event VaultRegistered(
    uint256 vaultId,
    address owner,
    address token,
    uint256 fee
)
```

Event emitted when a new vault is registered.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 |  |
| `owner` | address | The address that receives the fees from the payment. |
| `token` | address | The zero address for Ether, otherwise an ERC20 token. |
| `fee` | uint256 | The amount of fee to pay in base units. |
### Withdrawn

```solidity
event Withdrawn(
    uint256 vaultId,
    uint256 guildAmount,
    uint256 ownerAmount
)
```

Event emitted when funds are withdrawn by a vault owner.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 | The id of the vault. |
| `guildAmount` | uint256 | The amount received by the Guild fee collector in base units. |
| `ownerAmount` | uint256 | The amount received by the vault's owner in base units. |

## Custom errors

### AlreadyPaid

```solidity
error AlreadyPaid(uint256 vaultId, address sender)
```

Error thrown when multiple payments aren't enabled, but the sender attempts to pay repeatedly.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| vaultId | uint256 | The id of the vault. |
| sender | address | The sender of the transaction. |

### IncorrectFee

```solidity
error IncorrectFee(uint256 vaultId, uint256 paid, uint256 requiredAmount)
```

Error thrown when an incorrect amount of fee is attempted to be paid.

_requiredAmount might be 0 in cases when an ERC20 payment was expected but Ether was received, too._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| vaultId | uint256 | The id of the vault. |
| paid | uint256 | The amount of funds received. |
| requiredAmount | uint256 | The amount of fees required by the vault. |

### AccessDenied

```solidity
error AccessDenied(address sender, address owner)
```

Error thrown when a function is attempted to be called by the wrong address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | The address that sent the transaction. |
| owner | address | The address that is allowed to call the function. |

### TransferFailed

```solidity
error TransferFailed(address from, address to)
```

Error thrown when an ERC20 transfer failed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The sender of the token. |
| to | address | The recipient of the token. |

### VaultDoesNotExist

```solidity
error VaultDoesNotExist(uint256 vaultId)
```

Error thrown when a vault does not exist.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| vaultId | uint256 | The id of the requested vault. |

## Custom types

### Vault

```solidity
struct Vault {
  address owner;
  address token;
  bool multiplePayments;
  uint120 fee;
  uint128 collected;
  mapping(address => bool) paid;
}
```

