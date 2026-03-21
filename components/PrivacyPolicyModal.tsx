import { Modal, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";

const LAST_UPDATED = "21 March 2026";
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

          <Section title="2. Local-First Data Model">
            KneeBack is built with privacy by default. All of your personal recovery data —
            including your profile, exercise logs, ROM measurements, milestones, and notification
            preferences — is stored exclusively on your device.{"\n\n"}
            No data is ever sent to our servers unless you explicitly create an account and enable
            cloud sync. You remain in full control of your data at all times.
          </Section>

          <Section title="3. Data We Collect (Cloud Sync Only)">
            The following data is collected and stored in the cloud only if you choose to create
            an account and enable sync:{"\n\n"}
            <BulletList items={[
              "Account information: your email address used for authentication.",
              "Recovery profile: surgery date, knee side (left/right), and graft type.",
              "Health & exercise data: daily exercise logs, range-of-motion (ROM) measurements, and streak activity.",
              "Exercise plan: your selected exercises and personal customisations.",
              "Notification preferences: daily reminder time and evening nudge setting.",
            ]} />
            {"\n"}
            Community content (posts and comments) is linked to an anonymous device identifier
            only — your email address is never exposed in the community, regardless of whether
            you have an account.
          </Section>

          <Section title="4. Why We Process Your Data">
            When you opt in to cloud sync, we process your data for the following purposes:{"\n\n"}
            <BulletList items={[
              "To back up your recovery data so you never lose your progress.",
              "To enable access to your data across multiple devices.",
              "To restore your data if you reinstall the app or switch devices.",
              "To allow you to export or delete your data at any time.",
            ]} />
            {"\n"}
            The legal basis for processing is your explicit consent, given when you create an
            account and agree to this policy (Art. 6(1)(a) GDPR; Art. 9(2)(a) GDPR for health
            data). You may withdraw consent at any time by deleting your account.
          </Section>

          <Section title="5. Data Storage & Security">
            When cloud sync is enabled, your data is stored using Supabase, a cloud database
            provider with servers located within the European Union (EU). We apply
            industry-standard security measures including encryption in transit (TLS) and at
            rest.{"\n\n"}
            When you use KneeBack without an account, no data leaves your device. Your on-device
            data is protected by your device's own security mechanisms.{"\n\n"}
            We do not sell your personal data to third parties.
          </Section>

          <Section title="6. Third Parties">
            We share data with third parties only as necessary to operate the optional cloud sync
            feature:{"\n\n"}
            <BulletList items={[
              "Supabase — cloud database and authentication infrastructure (EU-based). Only used when you create an account.",
              "Expo / Apple / Google — for delivering push notifications to your device (mobile only).",
            ]} />
          </Section>

          <Section title="7. Data Retention">
            Cloud data is retained for as long as your account is active. If you delete your
            account, all personal data stored in the cloud is permanently and irreversibly deleted
            within 30 days. Your on-device data is not affected by account deletion — you can
            clear it separately via Profile › Reset App.{"\n\n"}
            Anonymised, aggregated statistics may be retained for service improvement purposes.
          </Section>

          <Section title="8. Your Rights Under GDPR">
            As a data subject under the GDPR, you have the following rights:{"\n\n"}
            <BulletList items={[
              "Right of access — you can export all your data via Profile › Export My Data.",
              "Right to rectification — you can update your recovery profile in the app at any time.",
              "Right to erasure — you can permanently delete your account and all cloud data via Profile › Delete Account. On-device data can be cleared via Profile › Reset App.",
              "Right to data portability — your exported data is provided in JSON format.",
              "Right to withdraw consent — you can disable cloud sync at any time by deleting your account; your data will remain on-device.",
              "Right to object — you can contact us to object to any processing at " + CONTACT_EMAIL + ".",
              "Right to lodge a complaint — you have the right to complain to your local data protection authority.",
            ]} />
          </Section>

          <Section title="9. Children's Privacy">
            KneeBack is not intended for use by children under the age of 16. We do not knowingly
            collect personal data from children. If you believe a child has provided us with their
            data, please contact us at{" "}
            <Text style={{ color: Colors.primary }}>{CONTACT_EMAIL}</Text>.
          </Section>

          <Section title="10. Changes to This Policy" last>
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
