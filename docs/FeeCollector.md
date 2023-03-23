# FeeCollector

A smart contract for registering vaults for payments.

## Variables

### guildTreasury

```solidity
address payable guildTreasury
```

Returns the address that receives Guild's share from the funds.

### totalFeeBps

```solidity
uint96 totalFeeBps
```

Returns the percentage of Guild's and any partner's share expressed in basis points.

### feeSchemas

```solidity
mapping(string => struct IFeeCollector.FeeShare[]) feeSchemas
```

### vaults

```solidity
struct IFeeCollector.Vault[] vaults
```

## Functions

### constructor

```solidity
constructor(
    address payable guildTreasury_,
    uint96 totalFeeBps_
) 
```

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `guildTreasury_` | address payable | The address that will receive Guild's share from the funds. |
| `totalFeeBps_` | uint96 | The percentage of Guild's and any partner's share expressed in basis points. |

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
    struct IFeeCollector.FeeShare[] feeShare
) external
```

#### Parameters

| Name | Type | Description |
| :--- | :--- | :---------- |
| `key` | string |  |
| `feeShare` | struct IFeeCollector.FeeShare[] |  |

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

