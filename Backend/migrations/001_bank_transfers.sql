-- Additive migration: existing tables and records are left unchanged.
-- A transfer allocated across bills has one row per recorded payment.
CREATE TABLE IF NOT EXISTS bank_transfers (
  bank_transfer_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id INT NOT NULL,
  order_id INT NOT NULL,
  customer_id INT NOT NULL,
  reference_number VARCHAR(12) NOT NULL,
  amount DECIMAL(9,2) NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bank_transfer_id),
  UNIQUE KEY bank_transfers_payment (payment_id),
  KEY bank_transfers_reference (reference_number),
  KEY bank_transfers_order (order_id)
) ENGINE=InnoDB;
