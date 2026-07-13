use poseidon::poseidon2::Poseidon2;

fn poseidon_commitment(values: [u64; 24]) -> Field {
    let field_values: [Field; 24] = [
        values[0] as Field,
        values[1] as Field,
        values[2] as Field,
        values[3] as Field,
        values[4] as Field,
        values[5] as Field,
        values[6] as Field,
        values[7] as Field,
        values[8] as Field,
        values[9] as Field,
        values[10] as Field,
        values[11] as Field,
        values[12] as Field,
        values[13] as Field,
        values[14] as Field,
        values[15] as Field,
        values[16] as Field,
        values[17] as Field,
        values[18] as Field,
        values[19] as Field,
        values[20] as Field,
        values[21] as Field,
        values[22] as Field,
        values[23] as Field
    ];

    Poseidon2::hash(field_values, 24)
}

fn abs_diff(a: u64, b: u64) -> u64 {
    if a > b {
        a - b
    } else {
        b - a
    }
}

fn squared_distance(a: [u64; 24], b: [u64; 24]) -> u64 {
    let mut distance: u64 = 0;

    let d0 = abs_diff(a[0], b[0]);
    let d1 = abs_diff(a[1], b[1]);
    let d2 = abs_diff(a[2], b[2]);
    let d3 = abs_diff(a[3], b[3]);
    let d4 = abs_diff(a[4], b[4]);
    let d5 = abs_diff(a[5], b[5]);
    let d6 = abs_diff(a[6], b[6]);
    let d7 = abs_diff(a[7], b[7]);
    let d8 = abs_diff(a[8], b[8]);
    let d9 = abs_diff(a[9], b[9]);
    let d10 = abs_diff(a[10], b[10]);
    let d11 = abs_diff(a[11], b[11]);
    let d12 = abs_diff(a[12], b[12]);
    let d13 = abs_diff(a[13], b[13]);
    let d14 = abs_diff(a[14], b[14]);
    let d15 = abs_diff(a[15], b[15]);
    let d16 = abs_diff(a[16], b[16]);
    let d17 = abs_diff(a[17], b[17]);
    let d18 = abs_diff(a[18], b[18]);
    let d19 = abs_diff(a[19], b[19]);
    let d20 = abs_diff(a[20], b[20]);
    let d21 = abs_diff(a[21], b[21]);
    let d22 = abs_diff(a[22], b[22]);
    let d23 = abs_diff(a[23], b[23]);

    distance = distance + d0 * d0;
    distance = distance + d1 * d1;
    distance = distance + d2 * d2;
    distance = distance + d3 * d3;
    distance = distance + d4 * d4;
    distance = distance + d5 * d5;
    distance = distance + d6 * d6;
    distance = distance + d7 * d7;
    distance = distance + d8 * d8;
    distance = distance + d9 * d9;
    distance = distance + d10 * d10;
    distance = distance + d11 * d11;
    distance = distance + d12 * d12;
    distance = distance + d13 * d13;
    distance = distance + d14 * d14;
    distance = distance + d15 * d15;
    distance = distance + d16 * d16;
    distance = distance + d17 * d17;
    distance = distance + d18 * d18;
    distance = distance + d19 * d19;
    distance = distance + d20 * d20;
    distance = distance + d21 * d21;
    distance = distance + d22 * d22;
    distance = distance + d23 * d23;

    distance
}

fn main(
    registered_embedding: [u64; 24],
    current_embedding: [u64; 24],
    commitment: pub Field,
    threshold: pub u64,
    nonce: pub u64
) {
    let computed_commitment = poseidon_commitment(registered_embedding);

    assert(computed_commitment == commitment);

    let distance = squared_distance(registered_embedding, current_embedding);

    assert(distance <= threshold);

    assert(nonce != 0);
}
