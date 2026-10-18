import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import bcrypt from "bcryptjs";
import { userRepository, sanitizeUser } from "../repositories/userRepository.js";
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

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
          return done(null, false, { message: "Invalid email or password." });
        }

        return done(null, sanitizeUser(user));
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Configure JWT Strategy (Bearer Token)
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
