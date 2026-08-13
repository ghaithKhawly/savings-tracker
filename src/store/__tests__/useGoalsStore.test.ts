import { useGoalsStore } from '../useGoalsStore';

describe('useGoalsStore', () => {
  beforeEach(() => {
    useGoalsStore.setState({ goals: [] });
  });

  it('adds a savings goal', () => {
    useGoalsStore.getState().addGoal({
      title: 'Emergency',
      targetUsd: 1000,
      assetTypes: 'ALL',
    });

    const goal = useGoalsStore.getState().goals[0];
    expect(goal.title).toBe('Emergency');
    expect(goal.targetUsd).toBe(1000);
    expect(goal.createdAt).toBeGreaterThan(0);
  });

  it('updates and removes goals', () => {
    useGoalsStore.getState().addGoal({ title: 'Trip', targetUsd: 500, assetTypes: ['USD'] });
    const goal = useGoalsStore.getState().goals[0];

    useGoalsStore.getState().updateGoal({ ...goal, completedAt: 123 });
    expect(useGoalsStore.getState().goals[0].completedAt).toBe(123);

    useGoalsStore.getState().removeGoal(goal.id);
    expect(useGoalsStore.getState().goals).toHaveLength(0);
  });

  it('replaces and clears goals', () => {
    useGoalsStore.getState().replaceGoals([
      { id: 'goal-1', title: 'One', targetUsd: 1, assetTypes: 'ALL', createdAt: 1 },
    ]);

    expect(useGoalsStore.getState().goals).toHaveLength(1);
    useGoalsStore.getState().clearGoals();
    expect(useGoalsStore.getState().goals).toHaveLength(0);
  });
});
