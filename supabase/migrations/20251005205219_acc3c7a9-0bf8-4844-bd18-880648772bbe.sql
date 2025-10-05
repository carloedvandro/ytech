-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user status
CREATE TYPE user_status AS ENUM ('pending_payment', 'active', 'inactive');

-- Create enum for plan type
CREATE TYPE plan_type AS ENUM ('basic', 'premium', 'vip');

-- Create enum for transaction type
CREATE TYPE transaction_type AS ENUM ('withdrawal', 'commission_release', 'payment');

-- Create enum for transaction status
CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create enum for commission status
CREATE TYPE commission_status AS ENUM ('pending', 'available', 'withdrawn');

-- Table: users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cpf TEXT UNIQUE NOT NULL,
  whatsapp TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  status user_status DEFAULT 'pending_payment',
  referred_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Table: whatsapp_verifications
CREATE TABLE whatsapp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP
);

-- Table: fraud_attempts
CREATE TABLE fraud_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL, -- CPF ou WhatsApp
  attempt_type TEXT NOT NULL, -- 'cpf' ou 'whatsapp'
  attempts INTEGER DEFAULT 1,
  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  last_attempt TIMESTAMP DEFAULT NOW(),
  UNIQUE(identifier, attempt_type)
);

-- Table: user_network (MLM structure)
CREATE TABLE user_network (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES users(id),
  level INTEGER NOT NULL, -- 1 a 4
  path TEXT[], -- Array para facilitar buscas
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table: plans
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type plan_type NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  commission_l1 DECIMAL(10,2) NOT NULL, -- R$ 26,00
  commission_l2_l4 DECIMAL(10,2) NOT NULL, -- R$ 5,00
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table: payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES plans(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, failed
  pix_code TEXT,
  pix_qr_code TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Table: commissions
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES users(id) NOT NULL,
  payment_id UUID REFERENCES payments(id) NOT NULL,
  level INTEGER NOT NULL, -- 1 a 4
  amount DECIMAL(10,2) NOT NULL,
  status commission_status DEFAULT 'pending',
  released_at TIMESTAMP,
  withdrawn_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table: transactions (saques)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  status transaction_status DEFAULT 'pending',
  pix_key TEXT,
  pix_key_type TEXT, -- cpf, phone, email, random
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Table: whatsapp_messages
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  whatsapp TEXT NOT NULL,
  message_type TEXT NOT NULL, -- verification_code, welcome, commission, etc
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
  mega_message_id TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  failed_at TIMESTAMP,
  failed_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT valid_message_status CHECK (status IN ('sent', 'delivered', 'read', 'failed'))
);

-- Indexes for performance
CREATE INDEX idx_users_cpf ON users(cpf);
CREATE INDEX idx_users_whatsapp ON users(whatsapp);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_referred_by ON users(referred_by);

CREATE INDEX idx_whatsapp_verifications_whatsapp ON whatsapp_verifications(whatsapp);
CREATE INDEX idx_whatsapp_verifications_expires ON whatsapp_verifications(expires_at);

CREATE INDEX idx_fraud_attempts_identifier ON fraud_attempts(identifier, attempt_type);

CREATE INDEX idx_user_network_user_id ON user_network(user_id);
CREATE INDEX idx_user_network_parent_id ON user_network(parent_id);
CREATE INDEX idx_user_network_level ON user_network(level);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

CREATE INDEX idx_commissions_user_id ON commissions(user_id);
CREATE INDEX idx_commissions_status ON commissions(status);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);

CREATE INDEX idx_whatsapp_messages_user ON whatsapp_messages(user_id);
CREATE INDEX idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX idx_whatsapp_messages_type ON whatsapp_messages(message_type);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_network ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users (podem ver apenas seus próprios dados)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for whatsapp_verifications (público para permitir verificação antes do login)
CREATE POLICY "Public can insert verifications" ON whatsapp_verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view own verifications" ON whatsapp_verifications
  FOR SELECT USING (true);

CREATE POLICY "Public can update own verifications" ON whatsapp_verifications
  FOR UPDATE USING (true);

-- RLS Policies for fraud_attempts (público para controle)
CREATE POLICY "Public can manage fraud attempts" ON fraud_attempts
  FOR ALL USING (true);

-- RLS Policies for user_network
CREATE POLICY "Users can view own network" ON user_network
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for plans (todos podem ver)
CREATE POLICY "Anyone can view plans" ON plans
  FOR SELECT USING (active = true);

-- RLS Policies for payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for commissions
CREATE POLICY "Users can view own commissions" ON commissions
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for whatsapp_messages
CREATE POLICY "Users can view own messages" ON whatsapp_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Insert default plans
INSERT INTO plans (name, type, price, commission_l1, commission_l2_l4, description, features) VALUES
  ('Plano Básico', 'basic', 129.00, 26.00, 5.00, 'Plano básico de internet 5G', 
   '["100 Mbps", "Suporte 24/7", "Wi-Fi grátis"]'::jsonb),
  ('Plano Premium', 'premium', 199.00, 26.00, 5.00, 'Plano premium com mais velocidade', 
   '["300 Mbps", "Suporte prioritário", "Wi-Fi mesh grátis"]'::jsonb),
  ('Plano VIP', 'vip', 299.00, 26.00, 5.00, 'Plano VIP com máxima velocidade', 
   '["500 Mbps", "Suporte VIP 24/7", "Wi-Fi mesh premium", "Instalação grátis"]'::jsonb);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();