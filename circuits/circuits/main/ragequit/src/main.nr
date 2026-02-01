use utxo::MERKLE_TREE_DEPTH;
use joinsplit::notes::WormholeNote;
use poseidon::poseidon2::Poseidon2;
use trees::merkle::MerkleTree;
use trees::types::{MembershipProver, MT_Creator};

fn hasher<let N: u32>(inputs: [Field; N]) -> Field {
    Poseidon2::hash(inputs, N)
}

fn main(
    wormhole_root: pub Field,
    wormhole_note: WormholeNote,
    wormhole_leaf_index: Field,
    wormhole_leaf_siblings: [Field; MERKLE_TREE_DEPTH],
    is_approved: bool
) -> pub (Field, Field, Field) { // wormhole commitment, nullifier and sender address
    let wormhole_leaf = wormhole_note.to_burn_commitment(is_approved);
    let wormhole_tree = MerkleTree::from(wormhole_root, hasher);
    wormhole_tree.membership(wormhole_leaf, wormhole_leaf_index, wormhole_leaf_siblings);
    (wormhole_leaf, wormhole_note.get_nullifier(), wormhole_note.sender)
}