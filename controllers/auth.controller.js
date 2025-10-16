const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcryptjs');
const { fetch } = require('undici');
const createTokens = require('../utils/createTokens');
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendTestEmail } = require('../utils/email.js');
const { 
    sendWhatsAppOTP: sendWhatsAppOTPUtil, 
    sendWhatsAppWelcome, 
    sendWhatsAppPasswordReset,
    validatePhoneNumber,
    formatPhoneNumber 
} = require('../utils/whatsapp.js');

const prisma = new PrismaClient();

// Optimize Prisma connection pooling
prisma.$connect();

// Production timeout wrapper
const withTimeout = async (promise, timeoutMs = 10000) => {
    if (process.env.NODE_ENV !== 'production') return promise;
    
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]);
};

// Optimized bcrypt rounds
const SALT_ROUNDS = process.env.NODE_ENV === 'production' ? 6 : 8;

// Role enum aligned with prisma/schema.prisma
const VALID_ROLES = ['ADMIN', 'PATIENT'];

// In-memory verification code store: { email -> { code, expiresAt } }
// Note: ephemeral across restarts; for production, persist in DB or cache.
const verificationStore = new Map();
// Reverse lookup store: { code -> { email, expiresAt } } for code-only verification
const codeLookupStore = new Map();

const toUserResponse = (user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    country: user.country,
    contactMethod: user.contactMethod,
    age: user.age,
    gdprConsent: user.gdprConsent,
    kvkkConsent: user.kvkkConsent,
    emailVerified: user.emailVerified,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

const selectUserBase = {
    id: true,
    email: true,
    password: true,
    name: true,
    phone: true,
    country: true,
    contactMethod: true,
    age: true,
    gdprConsent: true,
    kvkkConsent: true,
    emailVerified: true,
    role: true,
    createdAt: true,
    updatedAt: true,
};

const generateSixDigitCode = () => {
    let code = '';
    for (let i = 0; i < 6; i += 1) {
        code += String(Math.floor(Math.random() * 9) + 1); // 1-9 only
    }
    return code;
};

// Manual registration (fields aligned to schema.prisma)
async function register(req, res, next) {
        // Add request timeout for production
        const TIMEOUT_MS = 10000; // 10 seconds
        const timeoutPromise = new Promise((_, reject) => {
            if (process.env.NODE_ENV === 'production') {
                setTimeout(() => reject(new Error('Request timeout')), TIMEOUT_MS);
            }
        });

        try {
            const {
                email,
                password,
                name,
                phone,
                country,
                contactMethod,
                age,
                gdprConsent,
                kvkkConsent,
            } = req.body || {};

            if (typeof email !== 'string' || !email.includes('@')) {
                const err = new Error('Valid email is required');
                err.statusCode = 400; throw err;
            }
            if (typeof password !== 'string' || password.length < 6) {
                const err = new Error('Password must be at least 6 characters');
                err.statusCode = 400; throw err;
            }
            if (name !== undefined && (typeof name !== 'string')) { const err = new Error('name must be a string'); err.statusCode = 400; throw err; }
            if (phone !== undefined && (typeof phone !== 'string')) { const err = new Error('phone must be a string'); err.statusCode = 400; throw err; }
            if (country !== undefined && (typeof country !== 'string')) { const err = new Error('country must be a string'); err.statusCode = 400; throw err; }
            let validatedContactMethod = undefined;
            if (contactMethod !== undefined) {
                if (typeof contactMethod !== 'string') {
                    const err = new Error('contactMethod must be a string');
                    err.statusCode = 400;
                    throw err;
                }
                // Convert to uppercase to match enum values
                const upperContactMethod = contactMethod.toUpperCase();
                if (!['EMAIL', 'PHONE', 'WHATSAPP'].includes(upperContactMethod)) {
                    const err = new Error('contactMethod must be one of: email, phone, whatsapp');
                    err.statusCode = 400;
                    throw err;
                }
                validatedContactMethod = upperContactMethod;
                
                // Validate phone number if WhatsApp or PHONE is selected
                if ((upperContactMethod === 'WHATSAPP' || upperContactMethod === 'PHONE') && phone) {
                    if (!validatePhoneNumber(phone)) {
                        const err = new Error('Invalid phone number format for WhatsApp/Phone contact method');
                        err.statusCode = 400;
                        throw err;
                    }
                }
            }
            if (age !== undefined && (typeof age !== 'number' || age < 0)) { const err = new Error('age must be a positive number'); err.statusCode = 400; throw err; }
            if (gdprConsent !== true) { const err = new Error('GDPR consent is required'); err.statusCode = 400; throw err; }

            // Race the main operation against timeout in production
            const registerPromise = (async () => {
                const existing = await prisma.user.findUnique({ 
                    where: { email }, 
                    select: { id: true } 
                });
                if (existing) { 
                    const err = new Error('An account with this email already exists. Please use a different email or try logging in.'); 
                    err.statusCode = 409; 
                    throw err; 
                }

            // Use lower salt rounds in production for better performance while maintaining security
            const SALT_ROUNDS = process.env.NODE_ENV === 'production' ? 6 : 8;
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            const verificationCode = generateSixDigitCode();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // Create user with optimized query
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    phone,
                    country,
                    contactMethod: validatedContactMethod,
                    age,
                    gdprConsent,
                    kvkkConsent,
                    // role defaults to PATIENT
                    // emailVerified defaults to false
                },
                select: selectUserBase,
            });

            // Save verification code in-memory
            verificationStore.set(user.email, { code: verificationCode, expiresAt });
            codeLookupStore.set(verificationCode, { email: user.email, expiresAt });

            // Send verification code based on contact method
            if (validatedContactMethod === 'WHATSAPP' && phone) {
                // Send WhatsApp OTP
                const formattedPhone = formatPhoneNumber(phone);
                sendWhatsAppOTPUtil(formattedPhone, user.name || 'User', verificationCode)
                    .catch((error) => {
                        console.error('WhatsApp OTP send failed:', error);
                        // Fallback to email if WhatsApp fails
                        sendVerificationEmail(user.email, user.name || 'User', verificationCode, false)
                            .catch(() => { /* ignore email failures */ });
                    });
            } else {
                // Send email asynchronously - don't wait for it
                sendVerificationEmail(user.email, user.name || 'User', verificationCode, false)
                    .catch(() => { /* ignore email failures */ });
            }
            
            // Send test email after successful registration
            sendTestEmail({
                to: user.email,
                subject: "Registration Successful - Test Email",
                text: `Dear ${user.name || 'User'}, thank you for registering with Implanner. This is a test email.`, 
                html: `<p>Dear ${user.name || 'User'},</p><p>Thank you for registering with Implanner. This is a <b>test email</b>.</p>`
            }).catch(console.error);

                return res.status(201).json({
                    success: true,
                    message: 'Account created. Please verify your email before signing in.',
                    user: toUserResponse(user),
                    requiresVerification: true,
                });
            })();

            // In production, race against timeout
            if (process.env.NODE_ENV === 'production') {
                await Promise.race([registerPromise, timeoutPromise]);
            } else {
                await registerPromise;
            }
        } catch (err) {
            next(err);
        }
}

// Manual login
async function login(req, res, next) {
        try {
            const { email, password } = req.body || {};
            if (!email || !password) { const e = new Error('Email and password are required'); e.statusCode = 400; throw e; }

            // Wrap the main login logic in timeout for production
            const loginPromise = async () => {
                // Optimize query by selecting only needed fields initially
                const user = await prisma.user.findUnique({ 
                    where: { email }, 
                    select: { 
                        id: true, 
                        email: true, 
                        password: true, 
                        emailVerified: true,
                        name: true,
                        role: true
                    } 
                });
                if (!user) { const e = new Error('User not found'); e.statusCode = 404; throw e; }

                // Run password check and token creation in parallel if email is verified
                if (user.emailVerified) {
                    const [match, fullUser] = await Promise.all([
                        bcrypt.compare(password, user.password || ''),
                        prisma.user.findUnique({ where: { id: user.id }, select: selectUserBase })
                    ]);
                    
                    if (!match) { const e = new Error('Invalid password'); e.statusCode = 401; throw e; }
                    
                    const { accessToken, refreshToken } = createTokens({ userId: user.id, role: user.role });

                    // Send test email after successful login
                    sendTestEmail({
                        to: user.email,
                        subject: "Login Successful - Test Email",
                        text: `Dear ${user.name || 'User'}, you have successfully logged in to Implanner. This is a test email.`, 
                        html: `<p>Dear ${user.name || 'User'},</p><p>You have successfully logged in to Implanner. This is a <b>test email</b>.</p>`
                    }).catch(console.error);

                    return res.json({ success: true, accessToken, refreshToken, user: toUserResponse(fullUser) });
                }

                // Handle unverified email
                const existing = verificationStore.get(user.email);
                if (!existing || (existing.expiresAt && new Date() > existing.expiresAt)) {
                    const newCode = generateSixDigitCode();
                    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
                    verificationStore.set(user.email, { code: newCode, expiresAt: newExpiry });
                    codeLookupStore.set(newCode, { email: user.email, expiresAt: newExpiry });
                    
                    // Get user's contact method and phone for verification
                    const fullUser = await prisma.user.findUnique({
                        where: { id: user.id },
                        select: { contactMethod: true, phone: true }
                    });
                    
                    // Send verification code based on contact method
                    if (fullUser?.contactMethod === 'WHATSAPP' && fullUser?.phone) {
                        // Send WhatsApp OTP
                        const formattedPhone = formatPhoneNumber(fullUser.phone);
                        sendWhatsAppOTPUtil(formattedPhone, user.name || 'User', newCode)
                            .catch((error) => {
                                console.error('WhatsApp OTP send failed:', error);
                                // Fallback to email if WhatsApp fails
                                sendVerificationEmail(user.email, user.name || 'User', newCode, !user.password)
                                    .catch(() => {/* ignore email failures */});
                            });
                    } else {
                        // Send email asynchronously
                        sendVerificationEmail(user.email, user.name || 'User', newCode, !user.password)
                            .catch(() => {/* ignore email failures */});
                    }
                }
                const e = new Error('Please verify your email before signing in');
                e.statusCode = 403; e.requiresVerification = true; throw e;
            };

            await withTimeout(loginPromise());
        } catch (err) { next(err); }
}

// Get current profile (requires authenticate middleware)
async function profile(req, res, next) {
        try {
            const userId = req.user && req.user.id;
            if (!userId) { const e = new Error('Unauthenticated'); e.statusCode = 401; throw e; }

            const profilePromise = async () => {
                // Run queries in parallel for better performance
                const [user, latestTreatmentPlan, latestQuestionnaire] = await Promise.all([
                    prisma.user.findUnique({
                        where: { id: userId },
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            phone: true,
                            country: true,
                            contactMethod: true,
                            age: true,
                            gdprConsent: true,
                            kvkkConsent: true,
                            emailVerified: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    }),
                    prisma.treatmentPlan.findFirst({
                        where: { userId },
                        orderBy: { createdAt: 'desc' },
                        select: {
                            id: true,
                            userId: true,
                            source: true,
                            title: true,
                            summary: true,
                            storedPlan: true,
                            hasXRay: true,
                            hasExistingPlan: true,
                            budgetCents: true,
                            initialDataId: true,
                            xrayUrl: true,
                            analysisJson: true,
                            implants: true,
                            crowns: true,
                            fillings: true,
                            rootCanals: true,
                            selectedTeeth: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    }),
                    prisma.questionnaire.findFirst({
                        where: { userId },
                        orderBy: { createdAt: 'desc' },
                        select: {
                            id: true,
                            userId: true,
                            planId: true,
                            age: true,
                            boneLoss: true,
                            smoking: true,
                            chronicDiseases: true,
                            budgetPreference: true,
                            medicalCondition: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    }),
                ]);

                if (!user) { const e = new Error('User not found'); e.statusCode = 404; throw e; }

                // Construct response with latest data
                const response = {
                    ...user,
                    treatmentPlans: latestTreatmentPlan ? [latestTreatmentPlan] : [],
                    questionnaires: latestQuestionnaire ? [latestQuestionnaire] : [],
                };

                return res.json({ success: true, user: response });
            };

            await withTimeout(profilePromise());
        } catch (err) { next(err); }
}

// Verify email via 6-digit code (requires only code)
async function verifyEmailByCode(req, res, next) {
        try {
            const { code } = req.body || {};
            if (!code || String(code).length !== 6) { 
                const e = new Error('Valid 6-digit code is required'); 
                e.statusCode = 400; 
                throw e; 
            }

            const verifyPromise = async () => {
                // Look up email by code
                const codeEntry = codeLookupStore.get(String(code));
                if (!codeEntry || (codeEntry.expiresAt && new Date() > codeEntry.expiresAt)) {
                    const e = new Error('Invalid or expired verification code'); 
                    e.statusCode = 400; 
                    throw e; 
                }

                const email = codeEntry.email;
                
                // Optimize query by selecting only needed fields
                const user = await prisma.user.findUnique({ 
                    where: { email }, 
                    select: { 
                        id: true, 
                        email: true, 
                        name: true, 
                        emailVerified: true 
                    } 
                });
                
                if (!user) { const e = new Error('User not found'); e.statusCode = 404; throw e; }
                if (user.emailVerified) { return res.json({ success: true, message: 'Email already verified' }); }

                // Verify the code matches what's stored for this email
                const emailEntry = verificationStore.get(email);
                if (!emailEntry || emailEntry.code !== String(code)) {
                    const e = new Error('Invalid verification code'); 
                    e.statusCode = 400; 
                    throw e; 
                }

                // Get user's contact method and phone for welcome message
                const fullUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { contactMethod: true, phone: true }
                });

                // Update user and send welcome message based on contact method
                const updatePromise = prisma.user.update({ 
                    where: { id: user.id }, 
                    data: { emailVerified: true } 
                });

                let welcomePromise;
                if (fullUser?.contactMethod === 'WHATSAPP' && fullUser?.phone) {
                    const formattedPhone = formatPhoneNumber(fullUser.phone);
                    welcomePromise = sendWhatsAppWelcome(formattedPhone, user.name || 'User')
                        .catch((error) => {
                            console.error('WhatsApp welcome send failed:', error);
                            // Fallback to email
                            return sendWelcomeEmail(user.email, user.name || 'User')
                                .catch(() => {/* ignore email failures */});
                        });
                } else {
                    welcomePromise = sendWelcomeEmail(user.email, user.name || 'User')
                        .catch(() => {/* ignore email failures */});
                }

                await Promise.all([updatePromise, welcomePromise]);
                
                // Clean up both stores
                verificationStore.delete(email);
                codeLookupStore.delete(String(code));

                return res.json({ 
                    success: true, 
                    message: 'Email verified successfully', 
                    user: { id: user.id, email: user.email, name: user.name } 
                });
            };

            await withTimeout(verifyPromise());
        } catch (err) { next(err); }
}

// Resend verification code
async function resendVerificationCode(req, res, next) {
        try {
            const { email } = req.body || {};
            if (!email) { const e = new Error('Email is required'); e.statusCode = 400; throw e; }

            const resendPromise = async () => {
                // Optimize query by selecting only needed fields
                const user = await prisma.user.findUnique({ 
                    where: { email }, 
                    select: { 
                        id: true, 
                        email: true, 
                        name: true, 
                        emailVerified: true, 
                        password: true 
                    } 
                });
                
                if (!user) { const e = new Error('User not found'); e.statusCode = 404; throw e; }
                if (user.emailVerified) { const e = new Error('Email already verified'); e.statusCode = 400; throw e; }

                const newCode = generateSixDigitCode();
                const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

                // Update verification stores (synchronous)
                verificationStore.set(user.email, { code: newCode, expiresAt: newExpiry });
                codeLookupStore.set(newCode, { email: user.email, expiresAt: newExpiry });

                // Send verification code based on contact method
                if (user.contactMethod === 'WHATSAPP' && user.phone) {
                    // Send WhatsApp OTP
                    const formattedPhone = formatPhoneNumber(user.phone);
                    sendWhatsAppOTPUtil(formattedPhone, user.name || 'User', newCode)
                        .catch((error) => {
                            console.error('WhatsApp OTP resend failed:', error);
                            // Fallback to email if WhatsApp fails
                            const isGoogleUser = !user.password;
                            sendVerificationEmail(user.email, user.name || 'User', newCode, !!isGoogleUser)
                                .catch(() => {/* ignore email failures */});
                        });
                } else {
                    // Send email asynchronously
                    const isGoogleUser = !user.password;
                    sendVerificationEmail(user.email, user.name || 'User', newCode, !!isGoogleUser)
                        .catch(() => {/* ignore email failures */});
                }

                return res.json({ success: true, message: 'Verification email sent' });
            };

            await withTimeout(resendPromise());
        } catch (err) { next(err); }
}

// Google: verify id_token and then create/login user
async function verifyGoogleToken(req, res, next) {
        try {
            const { idToken, token } = req.body || {};
            const tokenToVerify = idToken || token;
            
            if (!tokenToVerify) { 
                const e = new Error('idToken or token is required'); 
                e.statusCode = 400; 
                throw e; 
            }

            console.log('Attempting to verify Google token...');
            console.log('Token type detection:', tokenToVerify.startsWith('ya29.') ? 'Access Token' : 'ID Token');
            
            // Auto-detect token type and route accordingly
            if (tokenToVerify.startsWith('ya29.')) {
                // This is an access token, use the access token verification
                console.log('Detected access token, routing to access token verification...');
                return verifyGoogleAccessToken({ body: { accessToken: tokenToVerify } }, res, next);
            } else {
                // This is an ID token, verify it directly
                console.log('Detected ID token, verifying with Google...');
                
                try {
                    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenToVerify}`);
                    console.log('Google API response status:', response.status);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Google API error response:', errorText);
                        const e = new Error(`Google token verification failed: ${response.status} ${response.statusText}`); 
                        e.statusCode = 401; 
                        throw e; 
                    }
                    
                    const data = await response.json();
                    console.log('Google API response data:', { 
                        email: data.email, 
                        hasError: !!data.error,
                        error: data.error,
                        aud: data.aud,
                        exp: data.exp 
                    });
                    
                    if (data.error) { 
                        const e = new Error(`Google token error: ${data.error}`); 
                        e.statusCode = 401; 
                        throw e; 
                    }

                    const email = data.email;
                    const firstName = data.given_name || '';
                    const lastName = data.family_name || '';

                    if (!email) { 
                        const e = new Error('Email not found in Google token'); 
                        e.statusCode = 400; 
                        throw e; 
                    }

                    console.log('Google token verified successfully for email:', email);
                    return googleAuthCore({ email, firstName, lastName }, req, res, next);
                    
                } catch (fetchError) {
                    console.error('Fetch error during Google token verification:', fetchError);
                    if (fetchError.statusCode) {
                        throw fetchError; // Re-throw our custom errors
                    }
                    const e = new Error(`Network error during Google token verification: ${fetchError.message}`); 
                    e.statusCode = 500; 
                    throw e; 
                }
            }
        } catch (err) { next(err); }
}

// Google: verify access_token and then create/login user
async function verifyGoogleAccessToken(req, res, next) {
        try {
            const { accessToken } = req.body || {};
            if (!accessToken) { const e = new Error('accessToken is required'); e.statusCode = 400; throw e; }

            console.log('Attempting to verify Google access token...');
            
            try {
                const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
                console.log('Google userinfo API response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Google userinfo API error response:', errorText);
                    const e = new Error(`Google access token verification failed: ${response.status} ${response.statusText}`); 
                    e.statusCode = 401; 
                    throw e; 
                }
                
                const data = await response.json();
                console.log('Google userinfo API response data:', { 
                    email: data.email, 
                    hasError: !!data.error,
                    error: data.error,
                    given_name: data.given_name,
                    family_name: data.family_name 
                });
                
                if (data.error) { 
                    const e = new Error(`Google access token error: ${data.error}`); 
                    e.statusCode = 401; 
                    throw e; 
                }

                const email = data.email;
                const firstName = data.given_name || '';
                const lastName = data.family_name || '';
                
                if (!email) { 
                    const e = new Error('Email not found in Google access token response'); 
                    e.statusCode = 400; 
                    throw e; 
                }

                console.log('Google access token verified successfully for email:', email);
                return googleAuthCore({ email, firstName, lastName }, req, res, next);
                
            } catch (fetchError) {
                console.error('Fetch error during Google access token verification:', fetchError);
                if (fetchError.statusCode) {
                    throw fetchError; // Re-throw our custom errors
                }
                const e = new Error(`Network error during Google access token verification: ${fetchError.message}`); 
                e.statusCode = 500; 
                throw e; 
            }
        } catch (err) { next(err); }
}

// Core Google auth: create user if not exists; require verification if not verified; issue tokens if verified
async function googleAuthCore(profile, req, res, next) {
        try {
            const { email, firstName, lastName } = profile;

            let user = await prisma.user.findUnique({ where: { email }, select: selectUserBase });

            if (!user) {
                const verificationCode = generateSixDigitCode();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

                user = await prisma.user.create({
                    data: {
                        email,
                        name: `${firstName} ${lastName}`.trim() || email,
                        password: '',
                        phone: null,
                        country: null,
                        contactMethod: null,
                        age: null,
                        gdprConsent: true,
                        kvkkConsent: true,
                        emailVerified: true, // Google users are pre-verified
                        // role defaults to PATIENT
                    },
                    select: selectUserBase,
                });

                // No need to send verification email for Google users
                // verificationStore.set(user.email, { code: verificationCode, expiresAt });
                // codeLookupStore.set(verificationCode, { email: user.email, expiresAt });
            } else {
                // User exists, but if they're authenticating with Google, they should be verified
                // Update their verification status and name if needed
                if (!user.emailVerified || user.password === '') {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            emailVerified: true,
                            name: `${firstName} ${lastName}`.trim() || email,
                        }
                    });
                    // Refresh user data
                    user = await prisma.user.findUnique({ where: { email }, select: selectUserBase });
                }
            }

            if (!user.emailVerified) {
                return res.status(403).json({
                    success: false,
                    error: 'Please verify your email address before signing in',
                    requiresVerification: true,
                    user: { id: user.id, email: user.email, name: user.name },
                });
            }

            const role = VALID_ROLES.includes(user.role) ? user.role : 'PATIENT';
            const { accessToken, refreshToken } = createTokens({ userId: user.id, role });
            return res.json({ success: true, accessToken, refreshToken, user: toUserResponse(user) });
        } catch (err) { next(err); }
}

// Send WhatsApp OTP for existing users
async function sendWhatsAppOTP(req, res, next) {
    try {
        const { email } = req.body || {};
        if (!email) { 
            const e = new Error('Email is required'); 
            e.statusCode = 400; 
            throw e; 
        }

        const sendOTPPromise = async () => {
            // Get user details
            const user = await prisma.user.findUnique({ 
                where: { email }, 
                select: { 
                    id: true, 
                    email: true, 
                    name: true, 
                    phone: true,
                    contactMethod: true,
                    emailVerified: true 
                } 
            });
            
            if (!user) { 
                const e = new Error('User not found'); 
                e.statusCode = 404; 
                throw e; 
            }
            
            if (user.emailVerified) { 
                const e = new Error('Email already verified'); 
                e.statusCode = 400; 
                throw e; 
            }

            if (user.contactMethod !== 'WHATSAPP' || !user.phone) {
                const e = new Error('User has not selected WhatsApp as contact method or phone number is missing'); 
                e.statusCode = 400; 
                throw e; 
            }

            const newCode = generateSixDigitCode();
            const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // Update verification stores
            verificationStore.set(user.email, { code: newCode, expiresAt: newExpiry });
            codeLookupStore.set(newCode, { email: user.email, expiresAt: newExpiry });

            // Send WhatsApp OTP
            const formattedPhone = formatPhoneNumber(user.phone);
            await sendWhatsAppOTPUtil(formattedPhone, user.name || 'User', newCode);

            return res.json({ 
                success: true, 
                message: 'WhatsApp verification code sent successfully' 
            });
        };

        await withTimeout(sendOTPPromise());
    } catch (err) { 
        next(err); 
    }
}

// Get user profile by ID
const getUserProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                id: parseInt(id)
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile',
            error: error.message
        });
    }
};

module.exports = {
    register,
    login,
    profile,
    verifyEmailByCode,
    resendVerificationCode,
    sendWhatsAppOTP,
    verifyGoogleToken,
    verifyGoogleAccessToken,
    googleAuthCore,
    getUserProfile
};


