import { Injectable, WritableSignal, signal } from '@angular/core';

/**
 * Sort state shape matching what SortDirective emits via (sortChange)/predicateChange/ascendingChange:
 * { predicate: T; ascending: boolean }. Kept string-typed here for the common case (server-side
 * sortable columns identified by field name).
 */
export interface SortState {
  predicate?: string;
  ascending?: boolean;
}

export const sortStateSignal = (initialSortState: SortState = {}): WritableSignal<SortState> => signal(initialSortState);

@Injectable({ providedIn: 'root' })
export class SortService {
  private collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  });

  public startSort(property: string, order: number): (a: any, b: any) => number {
    return (a: any, b: any) => this.collator.compare(a[property], b[property]) * order;
  }

  /** Builds a Spring Data `?sort=` query param array (e.g. ['symptoms,desc', 'id']) from a SortState. */
  public buildSortParam(sortState: SortState, defaultOrAdditionalSort = 'id'): string[] {
    const sort: string[] = [];
    if (sortState.predicate) {
      sort.push(`${sortState.predicate},${sortState.ascending ? 'asc' : 'desc'}`);
      if (sortState.predicate !== defaultOrAdditionalSort) {
        sort.push(defaultOrAdditionalSort);
      }
    } else if (defaultOrAdditionalSort !== 'id') {
      sort.push(defaultOrAdditionalSort);
    }
    return sort;
  }

  /** Parses a `predicate,direction` sort param (as found in a route's query params) back into a SortState. */
  public parseSortParam(sortParam?: string | null): SortState {
    const sortState: SortState = {};
    if (sortParam) {
      const [predicate, direction] = sortParam.split(',');
      if (predicate && direction) {
        sortState.predicate = predicate;
        sortState.ascending = direction === 'asc';
      }
    }
    return sortState;
  }
}
