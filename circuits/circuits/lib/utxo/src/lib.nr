use joinsplit::JoinSplit;
use joinsplit::notes::{InputNote, OutputNote, WormholeNote};
use ecrecover::ecrecover;

pub global MERKLE_TREE_DEPTH: u32 = 20;

pub fn execute_utxo<let M: u32, let N: u32, let C: u32>(
    pub_key_x: [u8; 32],
    pub_key_y: [u8; 32],
    signature: [u8; 64],
    hashed_message: [u8; 32], // pub - EIP-712 message hash % SNARK max field size
    shielded_root: Field, // pub
    wormhole_root: Field, // pub
    asset_id: Field,
    owner_address: Field,
    input_notes: [InputNote<M>; N],
    output_notes: [OutputNote; C],
    wormhole_note: Option<WormholeNote>,
    wormhole_leaf_index: Option<Field>,
    wormhole_leaf_siblings: Option<[Field; M]>,
    wormhole_approved: Option<bool>,
    wormhole_pseudo_secret: Option<Field>,
) -> (Field, [Field; N], [Field; C]) {
    let address = ecrecover(pub_key_x, pub_key_y, signature, hashed_message);
    assert(address == owner_address, "Invalid signature");

    let joinsplit = JoinSplit::new(
        shielded_root, 
        wormhole_root, 
        asset_id, 
        owner_address, 
        input_notes, 
        output_notes, 
        wormhole_note, 
        wormhole_leaf_index, 
        wormhole_leaf_siblings, 
        wormhole_approved, 
        wormhole_pseudo_secret
    );
    joinsplit.execute()
}