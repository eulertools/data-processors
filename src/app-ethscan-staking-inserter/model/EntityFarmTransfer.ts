import {DataTypes} from "sequelize";
import {sequelize} from "../sequelize";

const EntityFarmTransfer = sequelize.define('farm_transfers',
  {
    contract_address: {type: DataTypes.STRING},
    token_lp_address: {type: DataTypes.STRING},
    from_address: {type: DataTypes.STRING},
    token0_address: {type: DataTypes.STRING},
    token1_address: {type: DataTypes.STRING},
    value: {type: DataTypes.BIGINT},
    kind: {type: DataTypes.STRING},
    input: {type: DataTypes.BOOLEAN},
    transaction_hash: {type: DataTypes.STRING, primaryKey: true},
    log_index: {type: DataTypes.BIGINT, primaryKey: true},
    block_timestamp: {type: DataTypes.DATE, primaryKey: true},
    block_number: {type: DataTypes.BIGINT},
    block_hash: {type: DataTypes.STRING},
  },
  {
    schema: 'raw',
  }
);

export { EntityFarmTransfer };
