import { Modal, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";

const LAST_UPDATED = "13 March 2026";
const CONTACT_EMAIL = "kneebackapp@gmail.com";

export function PrivacyPolicyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#2D2D2D" }}>Privacy Policy</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="#6B6B6B" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator
        >
          <Text style={{ fontSize: 13, color: "#6B6B6B", marginBottom: 20 }}>
            Last updated: {LAST_UPDATED}
          </Text>

          <Section title="1. Who We Are">
            KneeBack ("we", "our", "us") is a mobile application designed to support individuals
            recovering from knee surgery. We are committed to protecting your personal data and
            complying with the General Data Protection Regulation (GDPR) and applicable data
            protection laws.{"\n\n"}
            For data-related enquiries, contact us at{" "}
            <Text style={{ color: Colors.primary }}>{CONTACT_EMAIL}</Text>.
          </Section>

          <Section title="2. Data We Collect">
            We collect the following personal data when you use KneeBack:{"\n\n"}
            <BulletList items={[
              "Account information: email address and (optionally) a Google account identifier used for authentication.",
              "Recovery profile: surgery date, knee side (left/right), and graft type.",
              "Health & exercise data: daily exercise logs, range-of-motion (ROM) measurements, and streak activity.",
              "Community content: posts, comments, and reactions you create in the community section.",
              "Notification preferences: daily reminder time and evening nudge setting.",
              "Device data: push notification token (mobile only) for sending reminders.",
            ]} />
          </Section>

          <Section title="3. Why We Process Your Data">
            We process your data for the following purposes:{"\n\n"}
            <BulletList items={[
              "To provide and personalise your knee recovery programme.",
              "To track your rehabilitation progress over time.",
              "To send you daily reminders and motivational nudges you have configured.",
              "To enable community features where you can share experiences with other users.",
              "To allow you to export or delete your data at any time.",
            ]} />
            {"\n"}
            The legal basis for processing is your consent given when you create an account, and
            our legitimate interest in providing the service you signed up for.
          </Section>

          <Section title="4. Data Storage & Security">
            Your data is stored securely using Supabase, a cloud database provider. Data is stored
            on servers located within the European Union (EU). We apply industry-standard security
            measures including encryption in transit (TLS) and at rest.{"\n\n"}
            We do not sell your personal data to third parties.
          </Section>

          <Section title="5. Third Parties">
            We share data with the following third parties only as necessary to operate the
            service:{"\n\n"}
            <BulletList items={[
              "Supabase — database and authentication infrastructure (EU-based).",
              "Google — if you choose to sign in with Google, Google processes your authentication. This is governed by Google's Privacy Policy.",
              "Expo / Apple / Google — for delivering push notifications to your device.",
            ]} />
          </Section>

          <Section title="6. Data Retention">
            We retain your personal data for as long as your account is active. If you delete your
            account, all personal data associated with your account is permanently and
            irreversibly deleted within 30 days. Anonymised, aggregated statistics may be retained
            for service improvement purposes.
          </Section>

          <Section title="7. Your Rights Under GDPR">
            As a data subject under the GDPR, you have the following rights:{"\n\n"}
            <BulletList items={[
              "Right of access — you can export all your data via Profile › Export My Data.",
              "Right to rectification — you can update your recovery profile in the app at any time.",
              "Right to erasure — you can permanently delete your account and all associated data via Profile › Delete Account.",
              "Right to data portability — your exported data is provided in JSON format.",
              "Right to object — you can contact us to object to any processing at " + CONTACT_EMAIL + ".",
              "Right to lodge a complaint — you have the right to complain to your local data protection authority.",
            ]} />
          </Section>

          <Section title="8. Children's Privacy">
            KneeBack is not intended for use by children under the age of 16. We do not knowingly
            collect personal data from children. If you believe a child has provided us with their
            data, please contact us at{" "}
            <Text style={{ color: Colors.primary }}>{CONTACT_EMAIL}</Text>.
          </Section>

          <Section title="9. Changes to This Policy" last>
            We may update this Privacy Policy from time to time. When we do, we will revise the
            "Last updated" date at the top of this document. Continued use of the app after changes
            are posted constitutes your acceptance of the updated policy.{"\n\n"}
            For questions or requests regarding your personal data, contact us at{" "}
            <Text style={{ color: Colors.primary }}>{CONTACT_EMAIL}</Text>.
          </Section>
        </ScrollView>

        {/* Close button */}
        <View style={{ padding: 20, paddingBottom: Platform.OS === "ios" ? 8 : 20 }}>
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: Colors.primary,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Section({
  title,
  children,
  last,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={{ marginBottom: last ? 0 : 24 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#2D2D2D", marginBottom: 8 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 14, color: "#4B4B4B", lineHeight: 22 }}>{children}</Text>
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, i) => (
        <Text key={i} style={{ fontSize: 14, color: "#4B4B4B", lineHeight: 22 }}>
          {"• "}{item}{i < items.length - 1 ? "\n" : ""}
        </Text>
      ))}
    </>
  );
}
