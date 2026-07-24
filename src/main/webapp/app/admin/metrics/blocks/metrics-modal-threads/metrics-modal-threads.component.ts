import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import SharedModule from 'app/shared/shared.module';
import { Thread, ThreadState } from 'app/admin/metrics/metrics.model';

@Component({
  selector: 'hpd-thread-modal',
  templateUrl: './metrics-modal-threads.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SharedModule, MatDialogModule, MatIconModule],
})
export class MetricsModalThreadsComponent implements OnInit {
  ThreadState = ThreadState;
  threadStateFilter?: ThreadState;
  threads?: Thread[];
  threadDumpAll = 0;
  threadDumpBlocked = 0;
  threadDumpRunnable = 0;
  threadDumpTimedWaiting = 0;
  threadDumpWaiting = 0;

  constructor(private dialogRef: MatDialogRef<MetricsModalThreadsComponent>) {}

  ngOnInit(): void {
    this.threads?.forEach(thread => {
      if (thread.threadState === ThreadState.Runnable) {
        this.threadDumpRunnable += 1;
      } else if (thread.threadState === ThreadState.Waiting) {
        this.threadDumpWaiting += 1;
      } else if (thread.threadState === ThreadState.TimedWaiting) {
        this.threadDumpTimedWaiting += 1;
      } else if (thread.threadState === ThreadState.Blocked) {
        this.threadDumpBlocked += 1;
      }
    });

    this.threadDumpAll = this.threadDumpRunnable + this.threadDumpWaiting + this.threadDumpTimedWaiting + this.threadDumpBlocked;
  }

  getBadgeClass(threadState: ThreadState): string {
    if (threadState === ThreadState.Runnable) {
      return 'bg-emerald-100 text-emerald-700';
    } else if (threadState === ThreadState.Waiting) {
      return 'bg-indigo-100 text-indigo-700';
    } else if (threadState === ThreadState.TimedWaiting) {
      return 'bg-amber-100 text-amber-700';
    } else if (threadState === ThreadState.Blocked) {
      return 'bg-rose-100 text-rose-700';
    }
    return '';
  }

  getThreads(): Thread[] {
    return this.threads?.filter(thread => !this.threadStateFilter || thread.threadState === this.threadStateFilter) ?? [];
  }

  dismiss(): void {
    this.dialogRef.close();
  }
}
