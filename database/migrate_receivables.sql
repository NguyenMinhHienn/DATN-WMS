-- =============================================
-- Migration: Accounts Receivable (Công Nợ) System
-- Date: 2026-04-18
-- Description: Tạo bảng receivables, payment_receipts, notifications
-- =============================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. Bảng receivables (Công nợ phải thu)
-- ============================================================
CREATE TABLE IF NOT EXISTS receivables (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    receivable_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'CN-2026-000001',
    
    -- Nguồn phát sinh
    source_type ENUM('order', 'export_receipt', 'export_transfer') NOT NULL,
    source_id INT UNSIGNED NOT NULL COMMENT 'ID của order/export_receipt/stock_transfer',
    source_number VARCHAR(50) NULL COMMENT 'Mã nguồn tham chiếu',
    
    -- Khách hàng / Người nợ
    debtor_type ENUM('user', 'customer', 'external') NOT NULL DEFAULT 'external',
    user_id INT UNSIGNED NULL COMMENT 'FK users - người mua online',
    debtor_name VARCHAR(255) NOT NULL COMMENT 'Tên người nợ (snapshot)',
    debtor_phone VARCHAR(20) NULL,
    debtor_email VARCHAR(100) NULL,
    debtor_address TEXT NULL,
    
    -- Số tiền
    total_amount DECIMAL(15,2) NOT NULL COMMENT 'Tổng phải thu',
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Đã thu',
    remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    
    -- Thời hạn
    issue_date DATE NOT NULL COMMENT 'Ngày phát sinh',
    due_date DATE NULL COMMENT 'Hạn thanh toán (NULL = thanh toán ngay)',
    payment_terms INT NULL DEFAULT 0 COMMENT 'Số ngày cho nợ: 0, 15, 30, 45',
    
    -- Trạng thái
    status ENUM('unpaid', 'partial', 'paid', 'overdue', 'cancelled', 'bad_debt') 
        NOT NULL DEFAULT 'unpaid',
    
    -- Audit
    created_by INT UNSIGNED NULL,
    last_payment_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL COMMENT 'Ngày thanh toán xong',
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_receivables_number (receivable_number),
    INDEX idx_receivables_source (source_type, source_id),
    INDEX idx_receivables_user_id (user_id),
    INDEX idx_receivables_status (status),
    INDEX idx_receivables_due_date (due_date),
    INDEX idx_receivables_issue_date (issue_date),
    
    CONSTRAINT fk_receivables_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_receivables_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Công nợ phải thu - Tự động tạo khi phiếu xuất/đơn hàng COD delivered';

-- ============================================================
-- 2. Bảng payment_receipts (Phiếu thu)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_receipts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    receipt_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'PT-2026-000001',
    
    -- Liên kết công nợ
    receivable_id INT UNSIGNED NOT NULL COMMENT 'FK receivables',
    
    -- Thông tin thanh toán
    amount DECIMAL(15,2) NOT NULL COMMENT 'Số tiền thu',
    payment_method ENUM('cash', 'bank_transfer', 'banking_online', 'cod_collected', 'other') 
        NOT NULL DEFAULT 'cash',
    payment_date DATE NOT NULL COMMENT 'Ngày thu tiền',
    
    -- Chi tiết banking (nếu có)
    bank_name VARCHAR(100) NULL,
    bank_account VARCHAR(50) NULL,
    bank_reference VARCHAR(100) NULL COMMENT 'Mã giao dịch ngân hàng',
    
    -- Trạng thái duyệt
    status ENUM('draft', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    
    -- Audit
    created_by INT UNSIGNED NULL COMMENT 'Staff tạo phiếu thu',
    approved_by INT UNSIGNED NULL COMMENT 'Admin duyệt',
    approved_at TIMESTAMP NULL,
    rejected_by INT UNSIGNED NULL,
    rejected_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_pr_number (receipt_number),
    INDEX idx_pr_receivable_id (receivable_id),
    INDEX idx_pr_status (status),
    INDEX idx_pr_payment_date (payment_date),
    
    CONSTRAINT fk_pr_receivable FOREIGN KEY (receivable_id) 
        REFERENCES receivables(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pr_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pr_approved_by FOREIGN KEY (approved_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Phiếu thu tiền - Staff tạo, Admin duyệt';

-- ============================================================
-- 3. Bảng notifications (Thông báo in-app)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL COMMENT 'Người nhận thông báo',
    
    type ENUM('payment_receipt', 'debt_reminder', 'debt_created', 'order_update', 'system') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Liên kết tới entity
    reference_type VARCHAR(50) NULL COMMENT 'receivable, payment_receipt, order...',
    reference_id INT UNSIGNED NULL,
    
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    read_at TIMESTAMP NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_notif_user_read (user_id, is_read),
    INDEX idx_notif_created (created_at),
    
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Thông báo in-app cho users';

-- ============================================================
-- 4. Document sequences cho mã tự động
-- ============================================================
INSERT INTO document_sequences (document_type, prefix, current_number, number_length, reset_period) VALUES
('receivable', 'CN-', 0, 6, 'yearly'),
('payment_receipt', 'PT-', 0, 6, 'yearly')
ON DUPLICATE KEY UPDATE document_type = document_type;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- END Migration: Accounts Receivable
-- ============================================================
