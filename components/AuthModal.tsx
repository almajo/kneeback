import { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import { Colors } from "../constants/colors";

WebBrowser.maybeCompleteAuthSession();

export interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (userId: string) => void;
}

export function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setEmail("");
    setPassword("");
    setError(null);
    setMode("signIn");
    onClose();
  }

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setError(null);

    const result =
      mode === "signIn"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;

    if (!userId) {
      setError("Signed in but could not retrieve session.");
      setLoading(false);
      return;
    }

    onSuccess(userId);
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      if (Platform.OS === "web") {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
        if (oauthError) {
          setError(oauthError.message);
          setLoading(false);
        }
        // On web, the page redirects — no further action needed here
        return;
      }

      const redirectUri = makeRedirectUri({ scheme: "kneebackapp" });
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUri, skipBrowserRedirect: true },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
        return;
      }

      if (!data.url) {
        setError("Could not start Google sign-in");
        setLoading(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      if (result.type === "success") {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
        if (exchangeError) {
          setError(exchangeError.message);
          setLoading(false);
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;

        if (!userId) {
          setError("Signed in but could not retrieve session.");
          setLoading(false);
          return;
        }

        onSuccess(userId);
      } else {
        setLoading(false);
      }
    } catch {
      setError("Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-center items-center"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <View
          className="bg-surface rounded-2xl p-6 mx-6 w-full"
          style={{ maxWidth: 360 }}
        >
          <Text className="text-xl font-bold mb-1" style={{ color: "#2D2D2D" }}>
            {mode === "signIn" ? "Sign In" : "Create Account"}
          </Text>
          <Text className="text-sm mb-4" style={{ color: "#6B6B6B" }}>
            {mode === "signIn"
              ? "Sign in to sync your data across devices."
              : "Create a free account to back up and sync your data."}
          </Text>

          <TextInput
            className="border border-border rounded-xl px-4 py-3 mb-3 text-base"
            style={{ color: "#2D2D2D", backgroundColor: "#FFF8F0" }}
            placeholder="Email"
            placeholderTextColor="#A0A0A0"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <TextInput
            className="border border-border rounded-xl px-4 py-3 mb-1 text-base"
            style={{ color: "#2D2D2D", backgroundColor: "#FFF8F0" }}
            placeholder="Password"
            placeholderTextColor="#A0A0A0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error && (
            <Text className="text-sm mb-3 mt-1" style={{ color: Colors.error }}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            className={`bg-primary rounded-xl py-3 items-center mt-3 mb-3 ${loading ? "opacity-50" : ""}`}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                {mode === "signIn" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center mb-3">
            <View className="flex-1 h-px bg-border" />
            <Text className="mx-4 text-sm" style={{ color: "#A0A0A0" }}>or</Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          <TouchableOpacity
            className={`rounded-xl py-3 items-center mb-3 border border-border bg-background ${loading ? "opacity-50" : ""}`}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Text className="font-bold text-base" style={{ color: "#2D2D2D" }}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center mb-3"
            onPress={() => {
              setMode((m) => (m === "signIn" ? "signUp" : "signIn"));
              setError(null);
            }}
            disabled={loading}
          >
            <Text className="text-sm" style={{ color: Colors.primary }}>
              {mode === "signIn"
                ? "Don't have an account? Create one"
                : "Already have an account? Sign in"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="rounded-xl py-3 items-center bg-background border border-border"
            onPress={handleClose}
            disabled={loading}
          >
            <Text className="font-semibold text-base" style={{ color: "#2D2D2D" }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
