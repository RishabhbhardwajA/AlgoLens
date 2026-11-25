import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import bcrypt from "bcryptjs";
import { userRepository, sanitizeUser } from "../repositories/userRepository.js";
import { extractSessionCookie } from "../utils/cookies.js";
import { JWT_SECRET } from "./env.js";

// Configure Local Strategy (Email + Password)
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: false,
    },
    async (email, password, done) => {
      try {
        const user = userRepository.findUserByEmail(email);
        if (!user) {
          return done(null, false, { message: "Invalid email or password." });
        }

        if (!user.password_hash) {
          return done(null, false, {
            message:
              "This account was created with Google Sign-In. Please click 'Continue with Google' or create a password via Sign Up.",
          });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
          return done(null, false, { message: "Invalid email or password." });
        }

        if (!user.is_email_verified) {
          return done(null, false, {
            message: "Please verify your email address before signing in.",
          });
        }

        return done(null, sanitizeUser(user));
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Configure JWT Strategy (httpOnly Session Cookie primary, Bearer fallback for CLI/API test harnesses)
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractSessionCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: JWT_SECRET,
    },
    async (jwtPayload: { id: string }, done) => {
      try {
        const user = userRepository.findUserById(jwtPayload.id);
        if (!user) {
          return done(null, false);
        }
        return done(null, sanitizeUser(user));
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

export default passport;
