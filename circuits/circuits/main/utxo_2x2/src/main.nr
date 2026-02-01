use utxo::{execute_utxo, MERKLE_TREE_DEPTH};
use joinsplit::notes::{InputNote, OutputNote, WormholeNote};

fn main(
    pub_key_x: [u8; 32],
    pub_key_y: [u8; 32],
    signature: [u8; 64],
    hashed_message: pub [u8; 32], // EIP-712 message hash % SNARK max field size
    shielded_root: pub Field,
    wormhole_root: pub Field,
    asset_id: Field,
    owner_address: Field,
    input_notes: [InputNote<MERKLE_TREE_DEPTH>; 2],
    output_notes: [OutputNote; 2],
    wormhole_note: Option<WormholeNote>,
    wormhole_leaf_index: Option<Field>,
    wormhole_leaf_siblings: Option<[Field; MERKLE_TREE_DEPTH]>,
    wormhole_approved: Option<bool>,
    wormhole_pseudo_secret: Option<Field>,
) -> pub (Field, [Field; 2], [Field; 2]) {
    execute_utxo(
        pub_key_x,
        pub_key_y,
        signature,
        hashed_message,
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
    )
}