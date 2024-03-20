import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { ITask, NewTask } from '../task.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts ITask for edit and NewTaskFormGroupInput for create.
 */
type TaskFormGroupInput = ITask | PartialWithRequiredKeyOf<NewTask>;

type TaskFormDefaults = Pick<NewTask, 'id'>;

type TaskFormGroupContent = {
  id: FormControl<ITask['id'] | NewTask['id']>;
  name: FormControl<ITask['name']>;
  description: FormControl<ITask['description']>;
  schedule: FormControl<ITask['schedule']>;
  duration: FormControl<ITask['duration']>;
  attendant: FormControl<ITask['attendant']>;
  createdDate: FormControl<ITask['createdDate']>;
  modifiedDate: FormControl<ITask['modifiedDate']>;
  createdBy: FormControl<ITask['createdBy']>;
  modifiedBy: FormControl<ITask['modifiedBy']>;
};

export type TaskFormGroup = FormGroup<TaskFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class TaskFormService {
  createTaskFormGroup(task: TaskFormGroupInput = { id: null }): TaskFormGroup {
    const taskRawValue = {
      ...this.getFormDefaults(),
      ...task,
    };
    return new FormGroup<TaskFormGroupContent>({
      id: new FormControl(
        { value: taskRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(taskRawValue.name),
      description: new FormControl(taskRawValue.description),
      schedule: new FormControl(taskRawValue.schedule),
      duration: new FormControl(taskRawValue.duration),
      attendant: new FormControl(taskRawValue.attendant),
      createdDate: new FormControl(taskRawValue.createdDate),
      modifiedDate: new FormControl(taskRawValue.modifiedDate),
      createdBy: new FormControl(taskRawValue.createdBy),
      modifiedBy: new FormControl(taskRawValue.modifiedBy),
    });
  }

  getTask(form: TaskFormGroup): ITask | NewTask {
    return form.getRawValue() as ITask | NewTask;
  }

  resetForm(form: TaskFormGroup, task: TaskFormGroupInput): void {
    const taskRawValue = { ...this.getFormDefaults(), ...task };
    form.reset(
      {
        ...taskRawValue,
        id: { value: taskRawValue.id, disabled: true },
      } as any /* cast to workaround https://github.com/angular/angular/issues/46458 */,
    );
  }

  private getFormDefaults(): TaskFormDefaults {
    return {
      id: null,
    };
  }
}
