use anchor_lang::prelude::*;

declare_id!("42X4XP4LuW5jm2cCkZhib61iJx62dnw8AEEYJQzPhhJW");

#[program]
pub mod face_auth {
    use super::*;

    pub fn register_commitment(
        ctx: Context<RegisterCommitment>,
        commitment: [u8; 32],
    ) -> Result<()> {
        let user_face = &mut ctx.accounts.user_face;
        let now = Clock::get()?.unix_timestamp;

        user_face.owner = ctx.accounts.owner.key();
        user_face.commitment = commitment;
        user_face.is_active = true;
        user_face.created_at = now;
        user_face.updated_at = now;
        user_face.bump = ctx.bumps.user_face;

        emit!(CommitmentRegistered {
            owner: user_face.owner,
            commitment,
            timestamp: now,
        });

        Ok(())
    }

    pub fn update_commitment(
        ctx: Context<UpdateCommitment>,
        new_commitment: [u8; 32],
    ) -> Result<()> {
        let user_face = &mut ctx.accounts.user_face;

        require!(user_face.is_active, FaceAuthError::InactiveCommitment);

        let now = Clock::get()?.unix_timestamp;

        user_face.commitment = new_commitment;
        user_face.updated_at = now;

        emit!(CommitmentUpdated {
            owner: user_face.owner,
            commitment: new_commitment,
            timestamp: now,
        });

        Ok(())
    }

    pub fn register_commitment_hex(
        ctx: Context<RegisterCommitmentHex>,
        commitment_hex: String,
    ) -> Result<()> {
        require!(
            commitment_hex.len() == 66,
            FaceAuthError::InvalidCommitmentHexLength
        );

        require!(
            commitment_hex.starts_with("0x"),
            FaceAuthError::InvalidCommitmentHexPrefix
        );

        let user_face = &mut ctx.accounts.user_face;
        let now = Clock::get()?.unix_timestamp;

        user_face.owner = ctx.accounts.owner.key();
        user_face.commitment_hex = commitment_hex.clone();
        user_face.is_active = true;
        user_face.created_at = now;
        user_face.updated_at = now;
        user_face.bump = ctx.bumps.user_face;

        emit!(CommitmentHexRegistered {
            owner: user_face.owner,
            commitment_hex,
            timestamp: now,
        });

        Ok(())
    }

    pub fn update_commitment_hex(
        ctx: Context<UpdateCommitmentHex>,
        commitment_hex: String,
    ) -> Result<()> {
        require!(
            commitment_hex.len() == 66,
            FaceAuthError::InvalidCommitmentHexLength
        );

        require!(
            commitment_hex.starts_with("0x"),
            FaceAuthError::InvalidCommitmentHexPrefix
        );

        let user_face = &mut ctx.accounts.user_face;

        require!(user_face.is_active, FaceAuthError::InactiveCommitment);

        let now = Clock::get()?.unix_timestamp;

        user_face.commitment_hex = commitment_hex.clone();
        user_face.updated_at = now;

        emit!(CommitmentHexUpdated {
            owner: user_face.owner,
            commitment_hex,
            timestamp: now,
        });

        Ok(())
    }

    pub fn revoke_commitment(ctx: Context<RevokeCommitment>) -> Result<()> {
        let user_face = &mut ctx.accounts.user_face;

        require!(user_face.is_active, FaceAuthError::InactiveCommitment);

        let now = Clock::get()?.unix_timestamp;

        user_face.is_active = false;
        user_face.updated_at = now;

        emit!(CommitmentRevoked {
            owner: user_face.owner,
            timestamp: now,
        });

        Ok(())
    }

    pub fn record_login(ctx: Context<RecordLogin>, nonce: [u8; 32]) -> Result<()> {
        require!(
            ctx.accounts.user_face.is_active,
            FaceAuthError::InactiveCommitment
        );

        let login_session = &mut ctx.accounts.login_session;
        let now = Clock::get()?.unix_timestamp;

        login_session.owner = ctx.accounts.owner.key();
        login_session.nonce = nonce;
        login_session.verified = true;
        login_session.created_at = now;
        login_session.bump = ctx.bumps.login_session;

        emit!(LoginVerified {
            owner: login_session.owner,
            nonce,
            timestamp: now,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct RegisterCommitment<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + UserFaceAccount::INIT_SPACE,
        seeds = [b"user-face", owner.key().as_ref()],
        bump
    )]
    pub user_face: Account<'info, UserFaceAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateCommitment<'info> {
    #[account(
        mut,
        seeds = [b"user-face", owner.key().as_ref()],
        bump = user_face.bump,
        has_one = owner
    )]
    pub user_face: Account<'info, UserFaceAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RegisterCommitmentHex<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + UserFaceHexAccount::INIT_SPACE,
        seeds = [b"user-face-v2", owner.key().as_ref()],
        bump
    )]
    pub user_face: Account<'info, UserFaceHexAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateCommitmentHex<'info> {
    #[account(
        mut,
        seeds = [b"user-face-v2", owner.key().as_ref()],
        bump = user_face.bump,
        has_one = owner
    )]
    pub user_face: Account<'info, UserFaceHexAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeCommitment<'info> {
    #[account(
        mut,
        seeds = [b"user-face", owner.key().as_ref()],
        bump = user_face.bump,
        has_one = owner
    )]
    pub user_face: Account<'info, UserFaceAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(nonce: [u8; 32])]
pub struct RecordLogin<'info> {
    #[account(
        seeds = [b"user-face", owner.key().as_ref()],
        bump = user_face.bump,
        has_one = owner
    )]
    pub user_face: Account<'info, UserFaceAccount>,

    #[account(
        init,
        payer = owner,
        space = 8 + LoginSession::INIT_SPACE,
        seeds = [b"login-session", owner.key().as_ref(), nonce.as_ref()],
        bump
    )]
    pub login_session: Account<'info, LoginSession>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct UserFaceAccount {
    pub owner: Pubkey,
    pub commitment: [u8; 32],
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserFaceHexAccount {
    pub owner: Pubkey,

    #[max_len(66)]
    pub commitment_hex: String,

    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct LoginSession {
    pub owner: Pubkey,
    pub nonce: [u8; 32],
    pub verified: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[event]
pub struct CommitmentRegistered {
    pub owner: Pubkey,
    pub commitment: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct CommitmentUpdated {
    pub owner: Pubkey,
    pub commitment: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct CommitmentHexRegistered {
    pub owner: Pubkey,
    pub commitment_hex: String,
    pub timestamp: i64,
}

#[event]
pub struct CommitmentHexUpdated {
    pub owner: Pubkey,
    pub commitment_hex: String,
    pub timestamp: i64,
}

#[event]
pub struct CommitmentRevoked {
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct LoginVerified {
    pub owner: Pubkey,
    pub nonce: [u8; 32],
    pub timestamp: i64,
}

#[error_code]
pub enum FaceAuthError {
    #[msg("Face commitment is inactive.")]
    InactiveCommitment,

    #[msg("Commitment hex must be exactly 66 characters including 0x prefix.")]
    InvalidCommitmentHexLength,

    #[msg("Commitment hex must start with 0x.")]
    InvalidCommitmentHexPrefix,
}
