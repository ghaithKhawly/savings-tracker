import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAssetsStore, { AssetType } from '../store/useAssetsStore';
import useGoalsStore, { SavingsGoal } from '../store/useGoalsStore';
import { getLivePrices, PriceData } from '../services/priceService';
import { useTheme } from '../contexts/ThemeContext';
import { BORDER_RADIUS, SPACING } from '../theme';
import { applyWhatIfToGoal, calculateGoalProgress, normalizeGoalAssetTypes } from '../utils/goals';
import { formatCurrencyValue, formatRelativeDate, parseAmountInput, sanitizeAmountInput } from '../utils/format';
import { useSettings } from '../contexts/SettingsContext';
import { convertAssetToUsd } from '../utils/assetCalculations';

const ASSET_TYPES: AssetType[] = ['USD', 'SYP', 'GOLD', 'SILVER'];

export default function Goals() {
  const assets = useAssetsStore((state) => state.assets);
  const goals = useGoalsStore((state) => state.goals);
  const addGoal = useGoalsStore((state) => state.addGoal);
  const updateGoal = useGoalsStore((state) => state.updateGoal);
  const removeGoal = useGoalsStore((state) => state.removeGoal);
  const { colors } = useTheme();
  const { settings } = useSettings();
  const [prices, setPrices] = useState<PriceData | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | undefined>();
  const [whatIfType, setWhatIfType] = useState<AssetType>('USD');
  const [whatIfAmount, setWhatIfAmount] = useState('');

  useEffect(() => {
    getLivePrices().then((result) => setPrices(result.data)).catch(() => setPrices(null));
  }, []);

  const progressItems = useMemo(
    () => goals.map((goal) => calculateGoalProgress(goal, assets, prices)),
    [assets, goals, prices]
  );
  const whatIfUsd = useMemo(() => {
    if (!prices || !whatIfAmount.trim()) return null;
    const parsed = parseAmountInput(whatIfAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return convertAssetToUsd(whatIfType, parsed, prices);
  }, [prices, whatIfAmount, whatIfType]);
  const whatIfGoal = useMemo(() => {
    const firstActive = progressItems.find((item) => !item.isComplete);
    return firstActive && whatIfUsd !== null ? applyWhatIfToGoal(firstActive, whatIfUsd) : null;
  }, [progressItems, whatIfUsd]);

  const handleSaveGoal = (payload: {
    title: string;
    targetUsd: number;
    assetTypes: AssetType[] | 'ALL';
    dueDate?: number;
    targetDate?: number;
    monthlyContributionUsd?: number;
    note?: string;
  }) => {
    if (editingGoal) {
      updateGoal({
        ...editingGoal,
        ...payload,
      });
    } else {
      addGoal(payload);
    }
    setFormVisible(false);
    setEditingGoal(undefined);
  };

  const handleDelete = (goal: SavingsGoal) => {
    Alert.alert('Delete Goal', `Delete "${goal.title}"? This does not affect your assets.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeGoal(goal.id) },
    ]);
  };

  const toggleComplete = (goal: SavingsGoal) => {
    updateGoal({
      ...goal,
      completedAt: goal.completedAt ? undefined : Date.now(),
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <View style={[styles.header, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.gray200 }]}>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Goals</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setEditingGoal(undefined);
            setFormVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Add savings goal"
        >
          <Ionicons name="add" size={18} color={colors.onPrimary} />
          <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={progressItems}
        keyExtractor={(item) => item.goal.id}
        contentContainerStyle={progressItems.length ? styles.listContent : styles.emptyContainer}
        ListHeaderComponent={
          <View style={[styles.whatIfCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
            <View style={styles.whatIfHeader}>
              <Text style={[styles.whatIfTitle, { color: colors.gray900 }]}>What-if planner</Text>
              <Text style={[styles.whatIfMeta, { color: colors.gray500 }]}>Simulate without saving</Text>
            </View>
            <View style={styles.typeRow}>
              {ASSET_TYPES.map((type) => {
                const selected = whatIfType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typePill, { backgroundColor: selected ? colors.primary : colors.gray200 }]}
                    onPress={() => setWhatIfType(type)}
                    accessibilityRole="button"
                    accessibilityLabel={`Simulate ${type}`}
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.typePillText, { color: selected ? colors.onPrimary : colors.gray700 }]}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={[styles.input, { borderColor: colors.gray200, color: colors.gray900, backgroundColor: colors.bgPrimary }]}
              value={whatIfAmount}
              onChangeText={(value) => setWhatIfAmount(sanitizeAmountInput(value))}
              keyboardType="decimal-pad"
              placeholder={`Amount in ${whatIfType === 'GOLD' || whatIfType === 'SILVER' ? 'grams' : whatIfType}`}
              placeholderTextColor={colors.gray400}
              accessibilityLabel="What-if amount"
            />
            <Text style={[styles.whatIfResult, { color: colors.gray600 }]}>
              {whatIfGoal
                ? `${whatIfGoal.goal.title}: ${whatIfGoal.progress.toFixed(0)}% complete after simulation`
                : 'Enter an amount to preview impact on your nearest active goal.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[styles.goalCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}
            accessibilityLabel={`${item.goal.title}: ${item.progress.toFixed(0)} percent complete, ${formatCurrencyValue(item.remainingUsd, { ...settings, currencyDisplay: 'USD' })} remaining`}
          >
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleBlock}>
                <Text style={[styles.goalTitle, { color: colors.gray900 }]}>{item.goal.title}</Text>
                <Text style={[styles.goalMeta, { color: colors.gray500 }]}>
                  {item.goal.assetTypes === 'ALL' ? 'All assets' : item.goal.assetTypes.join(', ')}
                  {item.goal.dueDate ? ` · Due ${formatRelativeDate(item.goal.dueDate)}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.completeButton, { backgroundColor: item.isComplete ? colors.successLight : colors.gray200 }]}
                onPress={() => toggleComplete(item.goal)}
                accessibilityRole="button"
                accessibilityLabel={item.isComplete ? 'Mark goal active' : 'Mark goal complete'}
              >
                <Ionicons name={item.isComplete ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={item.isComplete ? colors.success : colors.gray500} />
              </TouchableOpacity>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: colors.gray100 }]}>
              <View style={[styles.progressFill, { backgroundColor: item.isComplete ? colors.success : colors.primary, width: `${item.progress}%` }]} />
            </View>

            <View style={styles.goalStats}>
              <Text style={[styles.goalStat, { color: colors.gray900 }]}>
                {formatCurrencyValue(item.currentUsd, settings, prices?.usdToSyp)}
              </Text>
              <Text style={[styles.goalStatMuted, { color: colors.gray500 }]}>
                of {formatCurrencyValue(item.goal.targetUsd, { ...settings, currencyDisplay: 'USD' })}
              </Text>
            </View>
            <Text style={[styles.goalRemaining, { color: item.isComplete ? colors.success : colors.gray500 }]}>
              {item.isComplete ? 'Goal complete' : `${formatCurrencyValue(item.remainingUsd, { ...settings, currencyDisplay: 'USD' })} remaining`}
            </Text>
            {!item.isComplete && (
              <Text style={[styles.goalPlanText, { color: colors.gray500 }]}>
                {item.projectedCompletionDate
                  ? `Projected ${formatRelativeDate(item.projectedCompletionDate)}`
                  : item.goal.monthlyContributionUsd
                    ? 'Projection needs a remaining balance'
                    : 'Add monthly contribution for projection'}
                {item.neededMonthlyUsd ? ` · Needed/mo ${formatCurrencyValue(item.neededMonthlyUsd, { ...settings, currencyDisplay: 'USD' })}` : ''}
              </Text>
            )}
            {item.goal.note ? <Text style={[styles.goalNote, { color: colors.gray600 }]}>{item.goal.note}</Text> : null}

            <View style={styles.goalActions}>
              <TouchableOpacity
                onPress={() => {
                  setEditingGoal(item.goal);
                  setFormVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.goal.title}`}
              >
                <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.goal)} accessibilityRole="button" accessibilityLabel={`Delete ${item.goal.title}`}>
                <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>No savings goals yet</Text>
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>Set a target and track progress automatically from your assets.</Text>
            <TouchableOpacity
              style={[styles.emptyAction, { backgroundColor: colors.primary }]}
              onPress={() => setFormVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Create first savings goal"
            >
              <Ionicons name="flag" size={18} color={colors.onPrimary} />
              <Text style={[styles.emptyActionText, { color: colors.onPrimary }]}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <GoalFormModal
        visible={formVisible}
        goal={editingGoal}
        onCancel={() => {
          setFormVisible(false);
          setEditingGoal(undefined);
        }}
        onSubmit={handleSaveGoal}
      />
    </SafeAreaView>
  );
}

interface GoalFormModalProps {
  visible: boolean;
  goal?: SavingsGoal;
  onCancel: () => void;
  onSubmit: (payload: {
    title: string;
    targetUsd: number;
    assetTypes: AssetType[] | 'ALL';
    dueDate?: number;
    targetDate?: number;
    monthlyContributionUsd?: number;
    note?: string;
  }) => void;
}

function GoalFormModal({ visible, goal, onCancel, onSubmit }: GoalFormModalProps) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [targetUsd, setTargetUsd] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<AssetType[]>([]);
  const [targetDate, setTargetDate] = useState('');
  const [monthlyContributionUsd, setMonthlyContributionUsd] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(goal?.title || '');
    setTargetUsd(goal?.targetUsd ? String(goal.targetUsd) : '');
    setSelectedTypes(goal?.assetTypes === 'ALL' || !goal ? [] : goal.assetTypes);
    setTargetDate(goal?.targetDate || goal?.dueDate ? new Date(goal.targetDate ?? goal.dueDate ?? 0).toISOString().slice(0, 10) : '');
    setMonthlyContributionUsd(goal?.monthlyContributionUsd ? String(goal.monthlyContributionUsd) : '');
    setNote(goal?.note || '');
    setError(null);
  }, [goal, visible]);

  const toggleType = (type: AssetType) => {
    setSelectedTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  };

  const handleSubmit = () => {
    const parsedTarget = parseAmountInput(targetUsd);
    if (!title.trim()) {
      setError('Goal title is required.');
      return;
    }
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setError('Target must be greater than 0 USD.');
      return;
    }

    const parsedTargetDate = targetDate.trim() ? Date.parse(targetDate.trim()) : undefined;
    if (targetDate.trim() && !Number.isFinite(parsedTargetDate)) {
      setError('Target date must use YYYY-MM-DD format.');
      return;
    }
    const parsedContribution = monthlyContributionUsd.trim() ? parseAmountInput(monthlyContributionUsd) : undefined;
    if (monthlyContributionUsd.trim() && (!Number.isFinite(parsedContribution) || Number(parsedContribution) < 0)) {
      setError('Monthly contribution must be 0 or more USD.');
      return;
    }

    onSubmit({
      title: title.trim(),
      targetUsd: parsedTarget,
      assetTypes: normalizeGoalAssetTypes(selectedTypes),
      dueDate: parsedTargetDate,
      targetDate: parsedTargetDate,
      monthlyContributionUsd: parsedContribution,
      note: note.trim() || undefined,
    });
  };

  const content = (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.bgPrimary }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.gray200 }]}>
            <Text style={[styles.modalTitle, { color: colors.gray900 }]}>{goal ? 'Edit Goal' : 'Add Goal'}</Text>
            <TouchableOpacity onPress={onCancel} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Close goal form">
              <Ionicons name="close" size={24} color={colors.gray500} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.gray800 }]}>Title</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.gray200, color: colors.gray900, backgroundColor: colors.bgPrimary }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Emergency fund"
              placeholderTextColor={colors.gray400}
              accessibilityLabel="Goal title"
            />

            <Text style={[styles.label, { color: colors.gray800 }]}>Target (USD)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.gray200, color: colors.gray900, backgroundColor: colors.bgPrimary }]}
              value={targetUsd}
              onChangeText={(value) => setTargetUsd(sanitizeAmountInput(value))}
              keyboardType="decimal-pad"
              placeholder="1000"
              placeholderTextColor={colors.gray400}
              accessibilityLabel="Goal target in US dollars"
            />

            <Text style={[styles.label, { color: colors.gray800 }]}>Assets included</Text>
            <View style={styles.typeRow}>
              {ASSET_TYPES.map((type) => {
                const selected = selectedTypes.includes(type);
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typePill, { backgroundColor: selected ? colors.primary : colors.gray200 }]}
                    onPress={() => toggleType(type)}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle ${type} for goal`}
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.typePillText, { color: selected ? colors.onPrimary : colors.gray700 }]}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.helperText, { color: colors.gray500 }]}>Leave all unselected to include all assets.</Text>

            <Text style={[styles.label, { color: colors.gray800 }]}>Monthly contribution (optional USD)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.gray200, color: colors.gray900, backgroundColor: colors.bgPrimary }]}
              value={monthlyContributionUsd}
              onChangeText={(value) => setMonthlyContributionUsd(sanitizeAmountInput(value))}
              keyboardType="decimal-pad"
              placeholder="100"
              placeholderTextColor={colors.gray400}
              accessibilityLabel="Monthly contribution in US dollars"
            />

            <Text style={[styles.label, { color: colors.gray800 }]}>Target date (optional)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.gray200, color: colors.gray900, backgroundColor: colors.bgPrimary }]}
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.gray400}
              accessibilityLabel="Goal target date"
            />

            <Text style={[styles.label, { color: colors.gray800 }]}>Note (optional)</Text>
            <TextInput
              style={[styles.input, styles.noteInput, { borderColor: colors.gray200, color: colors.gray900, backgroundColor: colors.bgPrimary }]}
              value={note}
              onChangeText={setNote}
              placeholder="Why this goal matters"
              placeholderTextColor={colors.gray400}
              multiline
              accessibilityLabel="Goal note"
            />

            {error ? <Text style={[styles.formError, { color: colors.error }]}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.gray200 }]} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel goal form">
              <Text style={[styles.cancelText, { color: colors.gray600 }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSubmit} accessibilityRole="button" accessibilityLabel={goal ? 'Update goal' : 'Add goal'}>
              <Text style={[styles.saveText, { color: colors.onPrimary }]}>{goal ? 'Update' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  if (Platform.OS === 'web') {
    return visible ? <View style={styles.webModalRoot}>{content}</View> : null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: 44, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.sm },
  addBtnText: { fontSize: 14, fontWeight: '700' },
  listContent: { padding: SPACING.md, gap: SPACING.md },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
  emptyState: { alignItems: 'center', gap: SPACING.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  emptyAction: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: 44, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.md },
  emptyActionText: { fontSize: 14, fontWeight: '700' },
  goalCard: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  goalTitleBlock: { flex: 1 },
  goalTitle: { fontSize: 16, fontWeight: '700' },
  goalMeta: { fontSize: 12, marginTop: 2 },
  completeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  goalStats: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.xs },
  goalStat: { fontSize: 18, fontWeight: '800' },
  goalStatMuted: { fontSize: 12, fontWeight: '600' },
  goalRemaining: { fontSize: 12, fontWeight: '700' },
  goalPlanText: { fontSize: 12, fontWeight: '600' },
  goalNote: { fontSize: 13 },
  goalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.lg },
  actionText: { fontSize: 13, fontWeight: '700' },
  webModalRoot: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  whatIfCard: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, gap: SPACING.sm },
  whatIfHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
  whatIfTitle: { fontSize: 16, fontWeight: '800' },
  whatIfMeta: { fontSize: 12, fontWeight: '700' },
  whatIfResult: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  modalContainer: { flex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { maxHeight: '92%', borderTopLeftRadius: BORDER_RADIUS.lg, borderTopRightRadius: BORDER_RADIUS.lg, paddingTop: SPACING.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  modalForm: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  label: { fontSize: 14, fontWeight: '700', marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: { minHeight: 44, borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, fontSize: 16 },
  noteInput: { minHeight: 76, paddingTop: SPACING.sm, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  typePill: { minHeight: 38, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  typePillText: { fontSize: 13, fontWeight: '700' },
  helperText: { fontSize: 12, marginTop: SPACING.xs },
  formError: { fontSize: 13, fontWeight: '700', marginTop: SPACING.md },
  modalActions: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, paddingTop: SPACING.md },
  cancelButton: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  saveButton: { flex: 1, minHeight: 44, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 16, fontWeight: '700' },
  saveText: { fontSize: 16, fontWeight: '700' },
});
