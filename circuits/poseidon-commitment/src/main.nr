use poseidon::poseidon2::Poseidon2;

fn main(embedding: [Field; 24]) -> pub Field {
    let commitment = Poseidon2::hash(embedding, 24);

    commitment
}
