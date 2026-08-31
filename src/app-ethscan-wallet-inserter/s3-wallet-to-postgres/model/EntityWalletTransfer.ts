import {DataTypes} from "sequelize";
import { sequelize } from "../sequelize";

const EntityWalletTransfer = sequelize.define('wallet_transfers',
  {
    block_number: {type: DataTypes.BIGINT},
	  block_timestamp: {type: DataTypes.DATE, primaryKey: true},
	  transaction_hash: {type: DataTypes.STRING},
	  transfer_hash: {type: DataTypes.STRING, primaryKey: true},
    token_address: {type: DataTypes.STRING},
    wallet_address: {type: DataTypes.STRING},
    from_address: {type: DataTypes.STRING},
    to_address: {type: DataTypes.STRING},
    value: {type: DataTypes.BIGINT},
    price_usd: {type: DataTypes.DECIMAL},
    transaction_kind: {type: DataTypes.STRING},
  },
  {
    schema: 'raw',
  }
);

export { EntityWalletTransfer };
