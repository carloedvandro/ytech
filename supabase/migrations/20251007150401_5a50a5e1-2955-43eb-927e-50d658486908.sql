-- Create indexes for better query performance on sim_activations
CREATE INDEX IF NOT EXISTS idx_sim_activations_user_id 
ON sim_activations(user_id);

CREATE INDEX IF NOT EXISTS idx_sim_activations_status 
ON sim_activations(status);

CREATE INDEX IF NOT EXISTS idx_sim_activations_created_at 
ON sim_activations(created_at DESC);