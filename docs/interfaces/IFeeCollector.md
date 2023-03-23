# IFeeCollector

A smart contract for registering vaults for payments.

## Functions

### registerVault

```solidity
function registerVault(
    address payable owner,
    address token,
    bool multiplePayments,
    uint128 fee
) external
```

Registers a vault and it's fee.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `owner` | address payable | The address that receives the fees from the payment. |
| `token` | address | The zero address for Ether, otherwise an ERC20 token. |
| `multiplePayments` | bool | Whether the fee can be paid multiple times. |
| `fee` | uint128 | The amount of fee to pay in base units. |

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

### withdraw

```solidity
function withdraw(
    uint256 vaultId,
    string feeSchemaKey
) external
```

Distributes the funds from a vault to the fee collectors and the owner.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 | The id of the vault whose funds should be distributed. |
| `feeSchemaKey` | string | The key of the schema used to distribute fees. |

### addFeeSchema

```solidity
function addFeeSchema(
    string key,
    struct IFeeCollector.FeeShare[] feeShares
) external
```

Adds a new fee schema (array of FeeShares).
Note that any remaining percentage of the fees will go to Guild's treasury.
A FeeShare is an item that represents whom to transfer fees to and what percentage of the fees
should be sent (expressed in basis points).

Callable only by the owner.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `key` | string | The key of the schema, used to look it up in the feeSchemas mapping. |
| `feeShares` | struct IFeeCollector.FeeShare[] | An array of FeeShare structs. |

### setGuildTreasury

```solidity
function setGuildTreasury(
    address payable newTreasury
) external
```

Sets the address that receives Guild's share from the funds.

Callable only by the owner.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `newTreasury` | address payable | The new address of Guild's treasury. |

### setTotalFeeBps

```solidity
function setTotalFeeBps(
    uint96 newShare
) external
```

Sets Guild's and any partner's share from the funds.

Callable only by the owner.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `newShare` | uint96 | The percentual value expressed in basis points. |

### setVaultDetails

```solidity
function setVaultDetails(
    uint256 vaultId,
    address payable newOwner,
    bool newMultiplePayments,
    uint128 newFee
) external
```

Changes the details of a vault.

Callable only by the owner of the vault to be changed.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 | The id of the vault whose details should be changed. |
| `newOwner` | address payable | The address that will receive the fees from now on. |
| `newMultiplePayments` | bool | Whether the fee can be paid multiple times from now on. |
| `newFee` | uint128 | The amount of fee to pay in base units from now on. |

### getFeeSchema

```solidity
function getFeeSchema(
    string key
) external returns (struct IFeeCollector.FeeShare[] schema)
```

Returns a fee schema for a given key.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `key` | string | The key of the schema. |

### getVault

```solidity
function getVault(
    uint256 vaultId
) external returns (address payable owner, address token, bool multiplePayments, uint128 fee, uint128 collected)
```

Returns a vault's details.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 | The id of the queried vault. |

#### Return Values

| Name | Type | Description |
| :--- | :--- | :---------- |
| `owner` | address payable | The owner of the vault who recieves the funds. |
| `token` | address | The address of the token to receive funds in (the zero address in case of Ether). |
| `multiplePayments` | bool | Whether the fee can be paid multiple times. |
| `fee` | uint128 | The amount of required funds in base units. |
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

### guildTreasury

```solidity
function guildTreasury() external returns (address payable)
```

Returns the address that receives Guild's share from the funds.

### totalFeeBps

```solidity
function totalFeeBps() external returns (uint96)
```

Returns the percentage of Guild's and any partner's share expressed in basis points.

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
### FeeSchemaAdded

```solidity
event FeeSchemaAdded(
    string key
)
```

Event emitted when a new fee schema is added.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `key` | string | The key of the schema, used to look it up in the feeSchemas mapping. |
### GuildTreasuryChanged

```solidity
event GuildTreasuryChanged(
    address newTreasury
)
```

Event emitted when the Guild treasury address is changed.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `newTreasury` | address | The address to change Guild's treasury to. |
### TotalFeeBpsChanged

```solidity
event TotalFeeBpsChanged(
    uint96 newShare
)
```

Event emitted when the share of the total fee changes.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `newShare` | uint96 | The new value of totalFeeBps. |
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
    address payable owner,
    address token,
    uint256 fee
)
```

Event emitted when a new vault is registered.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 |  |
| `owner` | address payable | The address that receives the fees from the payment. |
| `token` | address | The zero address for Ether, otherwise an ERC20 token. |
| `fee` | uint256 | The amount of fee to pay in base units. |
### Withdrawn

```solidity
event Withdrawn(
    uint256 vaultId
)
```

Event emitted when funds are withdrawn by a vault owner.

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `vaultId` | uint256 | The id of the vault. |

## Custom errors

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

### FeeShare

```solidity
struct FeeShare {
  address payable treasury;
  uint96 feeShareBps;
}
```
### Vault

```solidity
struct Vault {
  address payable owner;
  address token;
  bool multiplePayments;
  uint128 fee;
  uint128 collected;
  mapping(address => bool) paid;
}
```

