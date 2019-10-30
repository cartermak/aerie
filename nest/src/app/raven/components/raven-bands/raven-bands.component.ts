/**
 * Copyright 2018, by the California Institute of Technology. ALL RIGHTS RESERVED. United States Government Sponsorship acknowledged.
 * Any commercial use must be negotiated with the Office of Technology Transfer at the California Institute of Technology.
 * This software may be subject to U.S. export control laws and regulations.
 * By accepting this document, the user agrees to comply with all applicable U.S. export laws and regulations.
 * User has the responsibility to obtain export licenses, or other export authority as may be required
 * before exporting such information to foreign countries or providing access to foreign persons
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { SortablejsOptions } from 'angular-sortablejs';
import { StringTMap, TimeRange } from '../../../shared/models';
import {
  RavenBandLeftClick,
  RavenCompositeBand,
  RavenEpoch,
  RavenPoint,
  RavenSortMessage,
  RavenUpdate,
} from '../../models';
import { bandById } from '../../util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'raven-bands',
  styleUrls: ['./raven-bands.component.css'],
  templateUrl: './raven-bands.component.html',
})
export class RavenBandsComponent implements OnChanges, OnInit {
  @Input()
  cursorColor: string;

  @Input()
  cursorTime: number | null;

  @Input()
  cursorWidth: number;

  @Input()
  bands: RavenCompositeBand[];

  @Input()
  containerId: string;

  @Input()
  dayCode: string;

  @Input()
  earthSecToEpochSec: number;

  @Input()
  epoch: RavenEpoch | null;

  @Input()
  excludeActivityTypes: string[];

  @Input()
  guides: number[];

  @Input()
  hoveredBandId: string;

  @Input()
  labelFontSize: number;

  @Input()
  labelWidth: number;

  @Input()
  lastClickTime: number | null;

  @Input()
  maxTimeRange: TimeRange;

  @Input()
  selectedBandId: string;

  @Input()
  selectedPoint: RavenPoint;

  @Input()
  selectedSubBandId: string | null;

  @Input()
  showLastClick: boolean;

  @Input()
  showTooltip: boolean;

  @Input()
  viewTimeRange: TimeRange;

  @Output()
  addDivider: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  bandLeftClick: EventEmitter<RavenBandLeftClick> = new EventEmitter<
    RavenBandLeftClick
  >();

  @Output()
  decreaseBandHeight: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  deleteBand: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  increaseBandHeight: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  settingsBand: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  newSort: EventEmitter<StringTMap<RavenSortMessage>> = new EventEmitter<
    StringTMap<RavenSortMessage>
  >();

  @Output()
  hoverBand: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  removeTimeCursor: EventEmitter<null> = new EventEmitter<null>();

  @Output()
  setTimeCursor: EventEmitter<number> = new EventEmitter<number>();

  @Output()
  updateAddTo: EventEmitter<RavenUpdate> = new EventEmitter<RavenUpdate>();

  @Output()
  updateOverlay: EventEmitter<RavenUpdate> = new EventEmitter<RavenUpdate>();

  @Output()
  updateViewTimeRange: EventEmitter<TimeRange> = new EventEmitter<TimeRange>();

  sortablejsOptions: SortablejsOptions;
  sortedAndFilteredBands: RavenCompositeBand[];

  ngOnInit() {
    this.sortablejsOptions = {
      animation: 0,
      delay: 0,
      ghostClass: 'sortable-placeholder',
      group: 'bands',
      onAdd: this.onSort.bind(this),
      onEnd: this.onSort.bind(this),
      onRemove: this.onSort.bind(this),
      scroll: true,
      scrollSensitivity: 30,
      scrollSpeed: 10,
      sort: true,
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.bands) {
      this.sortedAndFilteredBands = [...this.bands]
        .filter(band => band.containerId === this.containerId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
  }

  /**
   * trackBy for bands list.
   */
  bandsTrackByFn(index: number, item: RavenCompositeBand) {
    return item.id;
  }

  /**
   * Helper to sort bands after a sortablejs message.
   * By the time sortedAndFiltered bands gets to this function they should be in their new order.
   * We use that new order to build a dictionary of bands by id to update the store.
   *
   * TODO: Replace 'any' with a concrete type.
   */
  onSort(e: any) {
    const sort: StringTMap<RavenSortMessage> = {};

    for (let i = 0, l = this.sortedAndFilteredBands.length; i < l; ++i) {
      const band = this.sortedAndFilteredBands[i];

      sort[band.id] = {
        containerId: this.containerId,
        sortOrder: i,
      };
    }

    if (Object.keys(sort).length) {
      this.newSort.emit(sort);
    }
  }

  /**
   * Helper. Returns true if this band contains an activity band.
   */
  containActivityBand(bandId: string): boolean {
    const compositeBand = bandById(this.bands, bandId) as RavenCompositeBand;
    for (let i = 0, l = compositeBand.subBands.length; i < l; ++i) {
      if (compositeBand.subBands[i].type === 'activity') {
        return true;
      }
    }
    return false;
  }

  /**
   * Helper. Returns true if a subBand is in addTo mode.
   */
  containAddToBand(bandId: string): boolean {
    const compositeBand = bandById(this.bands, bandId) as RavenCompositeBand;
    for (let i = 0, l = compositeBand.subBands.length; i < l; ++i) {
      if (
        compositeBand.subBands[i].type === 'activity' &&
        compositeBand.subBands[i].addTo
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Helper. Returns true if this is a divider band.
   */
  isDividerBand(bandId: string): boolean {
    const compositeBand = bandById(this.bands, bandId) as RavenCompositeBand;
    return (
      compositeBand.subBands.length > 0 &&
      compositeBand.subBands[0].type === 'divider'
    );
  }

  /**
   * Helper. Returns true if band is in overlay mode.
   */
  isOverlay(bandId: string): boolean {
    const compositeBand = bandById(this.bands, bandId) as RavenCompositeBand;
    return compositeBand.overlay;
  }

  /**
   * Helper. Returns true if band is in overlay or contains a band in addTo mode.
   */
  isOverlayAddTo(bandId: string): boolean {
    const compositeBand = bandById(this.bands, bandId) as RavenCompositeBand;
    return compositeBand.overlay || this.containAddToBand(bandId);
  }

  /**
   * Event. Called when toggled from overlay mode and go to addTo mode if activity subBand exists.
   */
  onSwitchToAddTo(bandId: string) {
    this.updateOverlay.emit({ bandId, update: { overlay: false } });
    const compositeBand = bandById(this.bands, bandId) as RavenCompositeBand;
    const activityBands = compositeBand.subBands.filter(
      band => band.type === 'activity',
    );
    if (activityBands && activityBands.length > 0) {
      this.updateAddTo.emit({
        bandId,
        subBandId: activityBands[0].id,
        update: { addTo: true },
      });
    }
  }

  /**
   * Event. Called to exit addTo and return to 'none' mode.
   */
  onSwitchToNone(bandId: string) {
    this.updateOverlay.emit({ bandId, update: { overlay: false } });
    const compositeBand = bandById(this.bands, bandId) as RavenCompositeBand;
    const activityBands = compositeBand.subBands.filter(
      band => band.type === 'activity',
    );
    if (activityBands && activityBands.length > 0) {
      this.updateAddTo.emit({
        bandId,
        subBandId: activityBands[0].id,
        update: { addTo: false },
      });
    }
  }
}
