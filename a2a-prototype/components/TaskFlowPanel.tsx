import type { FC } from 'react';
import type { TaskFlowStep } from '@/lib/types';
import StepCard from './StepCard';

interface Props {
  steps: TaskFlowStep[];
}

const TaskFlowPanel: FC<Props> = ({ steps }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-zinc-800">
        <h3 className="text-zinc-300 text-xs font-mono font-semibold">Task Flow</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {steps.length === 0 ? (
          <p className="text-zinc-600 text-xs font-mono text-center py-8">No steps yet</p>
        ) : (
          steps.map((step) => (
            <StepCard key={step.step_id} step={step} />
          ))
        )}
      </div>
    </div>
  );
};

export default TaskFlowPanel;
