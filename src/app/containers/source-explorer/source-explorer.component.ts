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
  ChangeDetectorRef,
  Component,
  OnDestroy,
} from '@angular/core';

import {
  MatDialog,
} from '@angular/material';

import {
  Store,
} from '@ngrx/store';

import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';

import * as fromConfig from './../../reducers/config';
import * as fromSourceExplorer from './../../reducers/source-explorer';

import * as epochsActions from './../../actions/epochs';
import * as sourceExplorerActions from './../../actions/source-explorer';

import { WebsocketService } from './../../services';

import {
  RavenConfirmDialogComponent,
  RavenFileImportDialogComponent,
  RavenStateSaveDialogComponent,
} from './../../components';

import {
  RavenSource,
  RavenSourceActionEvent,
  StringTMap,
} from './../../shared/models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-source-explorer',
  styleUrls: ['./source-explorer.component.css'],
  templateUrl: './source-explorer.component.html',
})
export class SourceExplorerComponent implements OnDestroy {
  // Config state
  baseUrl: string;

  // Source Explorer state.
  tree: StringTMap<RavenSource>;

  private ngUnsubscribe: Subject<{}> = new Subject();

  constructor(
    private changeDetector: ChangeDetectorRef,
    private dialog: MatDialog,
    private store: Store<fromSourceExplorer.SourceExplorerState>,
    private webSocketService: WebsocketService,
  ) {
    // Config state.
    this.store.select(fromConfig.getConfigState).pipe(
      takeUntil(this.ngUnsubscribe),
    ).subscribe(state => {
      this.baseUrl = state.baseUrl;
      this.changeDetector.markForCheck();
    });

    // Source Explorer state.
    this.store.select(fromSourceExplorer.getTreeBySourceId).pipe(
      takeUntil(this.ngUnsubscribe),
    ).subscribe(tree => {
      this.tree = tree;

      // TODO. Find out how to remove this checking.
      this.changeDetector.markForCheck();
      setTimeout(() =>
        this.changeDetector.detectChanges(),
      );
    });

    // Connect to web socket to update new sources when they change on the server.
    this.connectToWebsocket();
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  /**
   * Helper that connects to the MPS Server websocket.
   * When a data sources changes we fetch new sources to update the source explorer.
   */
  connectToWebsocket() {
    this.webSocketService.connection.subscribe((msg: any) => {
      const data = JSON.parse(msg.data);
      if (data.detail === 'data source changed') {
        const pattern = new RegExp('(.*/fs-mongodb)(/.*)/(.*)');
        const match = data.subject.match(pattern);
        const sourceId = `${match[2]}`;
        const sourceUrl = `${match[1]}${match[2]}`;
        this.store.dispatch(new sourceExplorerActions.FetchSources(sourceId, sourceUrl));
      }
    });
  }

  /**
   * Event. Called when an `action` event is fired from the raven-tree.
   */
  onAction(action: RavenSourceActionEvent): void {
    const { event, source } = action;

    if (event === 'apply-layout') {
      this.openApplyLayoutDialog(source);
    } else if (event === 'apply-state') {
      this.openApplyStateDialog(source);
    } else if (event === 'delete') {
      this.openDeleteDialog(source);
    } else if (event === 'save') {
      this.openStateSaveDialog(source);
    } else if (event === 'file-import') {
      this.openFileImportDialog(source);
    } else if (event === 'epoch-load') {
      this.onLoadEpochs(source);
    }
  }

  /**
   * Event. Called when a `close` event is fired from a raven-tree.
   */
  onClose(source: RavenSource): void {
    this.store.dispatch(new sourceExplorerActions.CloseEvent(source.id));
  }

  /**
   * Event. Called when a `collapse` event is fired from a raven-tree.
   */
  onCollapse(source: RavenSource): void {
    this.store.dispatch(new sourceExplorerActions.CollapseEvent(source.id));
  }

  /**
   * Event. Called when an `expand` event is fired from a raven-tree.
   */
  onExpand(source: RavenSource): void {
    this.store.dispatch(new sourceExplorerActions.ExpandEvent(source.id));
  }

  onLoadEpochs(source: RavenSource): void {
    this.store.dispatch(new epochsActions.FetchEpochs(source.url));
  }

  /**
   * Event. Called when an `open` event is fired from a raven-tree.
   */
  onOpen(source: RavenSource): void {
    this.store.dispatch(new sourceExplorerActions.OpenEvent(source.id));
  }

  /**
   * Event. Called when a `select` event is fired from a raven-tree.
   */
  onSelect(source: RavenSource): void {
    this.store.dispatch(new sourceExplorerActions.SelectSource(source));
  }

  /**
   * Dialog trigger. Opens the apply layout dialog.
   */
  openApplyLayoutDialog(source: RavenSource) {
    // TODO.
  }

  /**
   * Dialog trigger. Opens the apply state dialog.
   */
  openApplyStateDialog(source: RavenSource) {
    const applyStateDialog = this.dialog.open(RavenConfirmDialogComponent, {
      data: {
        cancelText: 'No',
        confirmText: 'Yes',
        message: 'Applying this state will clear your current workspace. Are you sure you want to do this?',
      },
      width: '250px',
    });

    applyStateDialog.afterClosed().pipe(
      takeUntil(this.ngUnsubscribe),
    ).subscribe(result => {
      if (result.confirm) {
        this.store.dispatch(new sourceExplorerActions.ApplyState(source.url));
      }
    });
  }

  /**
   * Dialog trigger. Opens the delete dialog.
   */
  openDeleteDialog(source: RavenSource) {
    const stateDeleteDialog = this.dialog.open(RavenConfirmDialogComponent, {
      data: {
        cancelText: 'No',
        confirmText: 'Yes',
        message: `Are you sure you want to delete ${source.name}?`,
      },
      width: '250px',
    });

    stateDeleteDialog.afterClosed().pipe(
      takeUntil(this.ngUnsubscribe),
    ).subscribe(result => {
      if (result.confirm) {
        this.store.dispatch(new sourceExplorerActions.RemoveSourceEvent(source));
      }
    });
  }

  /**
   * Dialog trigger. Opens the save state dialog.
   */
  openStateSaveDialog(source: RavenSource): void {
    const stateStateSaveDialog = this.dialog.open(RavenStateSaveDialogComponent, {
      data: { source },
      width: '250px',
    });

    stateStateSaveDialog.afterClosed().pipe(
      takeUntil(this.ngUnsubscribe),
    ).subscribe(result => {
      if (result.save) {
        this.store.dispatch(new sourceExplorerActions.SaveState(source, result.name));
      }
    });
  }

  openFileImportDialog(source: RavenSource): void {
    const fileImportDialog = this.dialog.open(RavenFileImportDialogComponent, {
      data: { source },
      height: '600px',
      width: '500px',
    });

    fileImportDialog.afterClosed().subscribe(result => {
      if (result.import) {
        this.store.dispatch(new sourceExplorerActions.ImportSourceEvent({ name: result.name, fileData: result.fileData, fileType: result.fileType, mappingData: result.mappingData }, source));
      }
    });
  }
}
