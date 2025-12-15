import pool from '../config/database';
import { User, UserWithRoles, Role, CreateUserDto, UpdateUserDto } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class UserRepository {
    async findAll(): Promise<UserWithRoles[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.avatar_url, 
             u.status, u.email_verified_at, u.last_login_at, u.last_login_ip,
             u.created_at, u.updated_at
      FROM users u
      WHERE u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `);

        const users: UserWithRoles[] = [];
        for (const row of rows) {
            const roles = await this.getUserRoles(row.id);
            users.push({ ...row, roles } as UserWithRoles);
        }
        return users;
    }

    async findById(id: number): Promise<UserWithRoles | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.avatar_url, 
             u.status, u.email_verified_at, u.last_login_at, u.last_login_ip,
             u.created_at, u.updated_at
      FROM users u
      WHERE u.id = ? AND u.deleted_at IS NULL
    `, [id]);

        if (rows.length === 0) return null;

        const roles = await this.getUserRoles(id);
        return { ...rows[0], roles } as UserWithRoles;
    }

    async findByUsername(username: string): Promise<User | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM users WHERE username = ? AND deleted_at IS NULL
    `, [username]);

        return rows.length > 0 ? (rows[0] as User) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM users WHERE email = ? AND deleted_at IS NULL
    `, [email]);

        return rows.length > 0 ? (rows[0] as User) : null;
    }

    async findByUsernameWithPassword(username: string): Promise<User | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM users WHERE username = ? AND deleted_at IS NULL
    `, [username]);

        return rows.length > 0 ? (rows[0] as User) : null;
    }

    async getUserRoles(userId: number): Promise<Role[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT r.id, r.name, r.description, r.permissions, r.is_active
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ? AND r.is_active = 1
    `, [userId]);

        return rows as Role[];
    }

    async create(dto: CreateUserDto, passwordHash: string): Promise<number> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO users (username, email, password_hash, full_name, phone, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `, [dto.username, dto.email, passwordHash, dto.full_name, dto.phone || null]);

            const userId = result.insertId;

            // Assign roles
            if (dto.role_ids && dto.role_ids.length > 0) {
                for (const roleId of dto.role_ids) {
                    await connection.query(`
            INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)
          `, [userId, roleId]);
                }
            }

            await connection.commit();
            return userId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async update(id: number, dto: UpdateUserDto): Promise<boolean> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const updateFields: string[] = [];
            const values: any[] = [];

            if (dto.email !== undefined) {
                updateFields.push('email = ?');
                values.push(dto.email);
            }
            if (dto.full_name !== undefined) {
                updateFields.push('full_name = ?');
                values.push(dto.full_name);
            }
            if (dto.phone !== undefined) {
                updateFields.push('phone = ?');
                values.push(dto.phone);
            }
            if (dto.avatar_url !== undefined) {
                updateFields.push('avatar_url = ?');
                values.push(dto.avatar_url);
            }
            if (dto.status !== undefined) {
                updateFields.push('status = ?');
                values.push(dto.status);
            }

            if (updateFields.length > 0) {
                values.push(id);
                await connection.query(`
          UPDATE users SET ${updateFields.join(', ')} WHERE id = ?
        `, values);
            }

            // Update roles if provided
            if (dto.role_ids !== undefined) {
                await connection.query('DELETE FROM user_roles WHERE user_id = ?', [id]);
                for (const roleId of dto.role_ids) {
                    await connection.query(`
            INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)
          `, [id, roleId]);
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async delete(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
      UPDATE users SET deleted_at = NOW() WHERE id = ?
    `, [id]);

        return result.affectedRows > 0;
    }

    async updateLastLogin(id: number, ip: string): Promise<void> {
        await pool.query(`
      UPDATE users SET last_login_at = NOW(), last_login_ip = ?, failed_login_attempts = 0
      WHERE id = ?
    `, [ip, id]);
    }

    async getAllRoles(): Promise<Role[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, name, description, permissions, is_active
      FROM roles WHERE is_active = 1
    `);
        return rows as Role[];
    }
}

export const userRepository = new UserRepository();
