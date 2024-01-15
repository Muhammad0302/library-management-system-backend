import { Request, Response } from 'express';
import User, { UserDocument } from '../models/userModel';
import { createUser } from '../services/userServices';

import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import isAdmin from '../middleware/role';
import Admin, { AdminDocument } from '../models/adminModel';

interface CustomRequest extends Request {
	admin?: AdminDocument;
}

// Register Admin
const adminRegister = async (req: Request, res: Response) => {
	try {
		const { name, email, password } = req.body;
		const existingUser = await Admin.findOne({ email });
		if (existingUser) {
			res.status(409).json({
				success: false,
				message: 'User already exists',
			});
		} else {
			// Create a new admin document asynchronously
			const newAdmin = await Admin.create({
				name,
				email,
				password,
				// Assuming isAdmin is set to true by default in your schema
			});

			// Use the admin document to sign the token
			const token = jwt.sign(
				{ id: newAdmin.id, name, email, isAdmin: true },
				'sadiqkhangmuhammadsadiq',
				{ expiresIn: '5h' }
			);

			res.status(201).json({
				success: true,
				// token,
				message: `Admin saved successfully with token: ${token}`,
			});
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// createUser
const addUser = async (req: Request, res: Response) => {
	const { name, email, password, phoneNumber, addresses } = req.body;
	console.log('The data in the controller is :', req.body);

	try {
		const result = await createUser({
			name,
			email,
			password,
			phoneNumber,
			addresses,
		});

		if (result.success) {
			res.status(201).json(result);
		} else {
			res.status(500).json(result);
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// login user
const login = async (req: Request, res: Response) => {
	const { email, password } = req.body;
	try {
		const user = await Admin.findOne({ email });

		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'User not found',
			});
		}

		const isPasswordValid = await user.comparePassword(password);

		if (!isPasswordValid) {
			return res.status(401).json({ message: 'Invalid password' });
		}

		const token = user.generateToken();

		res.status(200).json({
			success: true,
			message: `User logged in successfully with token: ${token}`,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// Generate reset token
const generateResetToken = async (email: string) => {
	const user = await User.findOne({ email });
	if (!user) {
		return null;
	}

	const token = user.generateToken();
	return token;
};

// forgot password
const forgotPassword = async (req: Request, res: Response) => {
	const { email } = req.body;

	try {
		const resetToken = await generateResetToken(email);

		if (!resetToken) {
			return res.status(404).json({ message: 'User not found' });
		}

		const transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: 'sadiqmuhammad795@gmail.com',
				pass: 'xojg xerf rcgz uvkb',
			},
		});

		const mailOptions = {
			from: 'sadiqmuhammad795@gmail.com',
			to: email,
			subject: 'Password Reset',
			text: `Click the following link to reset your password: http://yourwebsite.com/reset-password/${resetToken}`,
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				return res.status(500).json({ message: 'Error sending email' });
			}
			console.log('Email sent: ' + info.response);
			res.status(200).json({ message: 'Reset link sent to your email' });
		});
	} catch (error) {
		res.status(500).json({ message: 'Internal server error' });
	}
};

// Reset Password (Verify token)
const resetPassword = async (req: Request, res: Response) => {
	const { token } = req.params;
	const { newPassword, email } = req.body;

	try {
		jwt.verify(token, 'sadiqkhangmuhammadsadiq', async (err) => {
			if (err) {
				return res.status(401).json({
					success: false,
					message: 'Invalid or expired token',
				});
			}

			const user = await User.findOne({ email });

			if (!user) {
				return res.status(404).json({
					success: false,
					message: 'User not found',
				});
			}

			user.password = newPassword;
			await user.save();

			res.status(200).json({
				success: true,
				message: 'Password reset successful',
			});
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// getSingleUser
const getSingleUser = async (req: Request, res: Response) => {
	const { id } = req.params;

	try {
		const user = await User.findById(id);

		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'User not found',
			});
		}

		res.status(200).json({
			success: true,
			user,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

//getAllUsers
const getAllUsers = async (req: Request, res: Response) => {
	try {
		const users = await User.find();

		res.status(200).json({
			success: true,
			users,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// updateUser
const updateUser = async (req: Request, res: Response) => {
	try {
		const updateData = req.body;
		const records = await User.findByIdAndUpdate(req.params.id, updateData, {
			new: true,
		});

		if (!records) {
			res.status(404).json({
				success: false,
				message: 'Record not found',
			});
		} else {
			res.status(200).json({
				success: true,
				message: 'User updated successfully',
			});
		}
	} catch (err) {
		res.status(500).send(err);
	}
};

// deleteUser
const deleteUser = async (req: Request, res: Response) => {
	try {
		const records = await User.findByIdAndDelete(req.params.id);
		if (!records) {
			res.status(404).json({
				success: false,
				message: 'Record not found',
			});
		} else {
			res.status(200).json({
				success: true,
				message: 'User deleted successfully',
			});
		}
	} catch (err) {
		res.status(500).send(err);
	}
};

export {
	adminRegister,
	addUser,
	login,
	forgotPassword,
	resetPassword,
	getSingleUser,
	getAllUsers,
	updateUser,
	deleteUser,
};
