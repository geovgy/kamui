use joinsplit::notes::WormholeNote;
use joinsplit::assert_merkle_leaf_membership;
use utxo::MERKLE_TREE_DEPTH;

fn main(
    wormhole_root: pub Field,
    wormhole_note: WormholeNote,
    wormhole_leaf_index: Field,
    wormhole_leaf_siblings: [Field; MERKLE_TREE_DEPTH],
    is_approved: bool,
) -> pub (Field, Field, Field) {
    // wormhole commitment, nullifier and sender address
    let wormhole_leaf = wormhole_note.to_burn_commitment(is_approved);
    assert_merkle_leaf_membership(wormhole_root, wormhole_leaf, wormhole_leaf_index, wormhole_leaf_siblings);
    (wormhole_leaf, wormhole_note.get_nullifier(), wormhole_note.sender)
}
