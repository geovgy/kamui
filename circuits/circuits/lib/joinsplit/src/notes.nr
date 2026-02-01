use poseidon::poseidon2::Poseidon2;

pub struct InputNote<let M: u32> {
    pub blinding: Field,
    pub amount: Field,
    pub leaf_index: Field, // in shielded pool commitment tree
    pub leaf_siblings: [Field; M], // in shielded pool commitment tree
}

pub impl <let M: u32> InputNote<M> {
    pub fn from(blinding: Field, amount: Field, leaf_index: Field, leaf_siblings: [Field; M]) -> Self {
        Self { blinding, amount, leaf_index, leaf_siblings }
    }

    pub fn to_commitment(self, owner_address: Field, asset_id: Field) -> Field {
        let blinded_owner = Poseidon2::hash([owner_address, self.blinding], 2);
        Poseidon2::hash([blinded_owner, asset_id, self.amount, 1], 4) // Should always be a transfer as transfer type
    }

    pub fn get_nullifier(self, owner_address: Field, asset_id: Field) -> Field {
        let secret_commitment = Poseidon2::hash([owner_address, asset_id, self.amount], 3);
        Poseidon2::hash([self.leaf_index, self.blinding, secret_commitment], 3)
    }
}

pub struct OutputNote {
    pub recipient: Field,
    pub blinding: Field, // If 0, then assume recipient is already hashed with blinding
    pub amount: Field,
    pub transfer_type: u8, // 1: Transfer, 2: Withdrawal
}

pub impl OutputNote {
    pub fn from(recipient: Field, blinding: Field, amount: Field, transfer_type: u8) -> Self {
        Self { recipient, blinding, amount, transfer_type }
    }

    pub fn get_recipient_hash(self) -> Field {
        if (self.blinding == 0) | (self.transfer_type == 2) {
            // If blinding is 0 and its a transfer, then assume recipient is already hashed with blinding
            // If its a withdrawal, then recipient should be Ethereum address and not hashed
            self.recipient
        } else {
            Poseidon2::hash([self.recipient, self.blinding], 2)
        }
    }

    pub fn to_commitment(self, asset_id: Field) -> Field {
        let recipient_hash = self.get_recipient_hash();
        Poseidon2::hash([recipient_hash, asset_id, self.amount, self.transfer_type as Field], 3)
    }
}

// Used for depositing from wormhole into shielded pool
pub struct WormholeNote {
    pub recipient: Field,
    pub wormhole_secret: Field,
    pub asset_id: Field,
    pub sender: Field,
    pub amount: Field,
    // leaf_index: Field, // in wormhole commitment tree  
    // leaf_siblings: [Field; M], // in wormhole commitment tree
}

pub fn get_wormhole_pseudo_nullifier(address: Field, asset_id: Field, secret: Field) -> Field {
    let pseudo_commitment = Poseidon2::hash([address, asset_id, 0, 0], 4);
    Poseidon2::hash([1, secret, pseudo_commitment], 3)
}

pub impl WormholeNote {
    fn from(recipient: Field, wormhole_secret: Field, asset_id: Field, sender: Field, amount: Field) -> Self {
        Self { recipient, wormhole_secret, asset_id, sender, amount }
    }

    pub fn get_burn_address(self) -> Field {
        let zk_wormhole = Field::from_le_bytes("ZKWORMHOLE".as_bytes());
        let hash = Poseidon2::hash([self.recipient, self.wormhole_secret, zk_wormhole], 3);
        let hash_bytes: [u8; 32] = hash.to_be_bytes();
        let mut address_bytes: [u8; 20] = [0; 20];
        for i in 0..20 {
            address_bytes[i] = hash_bytes[12 + i];
        }
        Field::from_be_bytes(address_bytes)
    }

    pub fn to_burn_commitment(self, approved: bool) -> Field {
        let burn_address = self.get_burn_address();
        // 1 signals commitment was approved
        // 0 signals commitment was not approved
        Poseidon2::hash([approved as Field, burn_address, self.asset_id, self.sender, self.amount], 5)
    }

    pub fn get_nullifier(self) -> Field {
        let secret_commitment = Poseidon2::hash([self.recipient, self.asset_id, self.sender, self.amount], 4);
        Poseidon2::hash([1, self.wormhole_secret, secret_commitment], 3)
    }
}