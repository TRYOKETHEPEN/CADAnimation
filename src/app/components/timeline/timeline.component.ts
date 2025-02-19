import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, Renderer2, Input, OnChanges, OnInit, SimpleChanges, AfterViewInit, ViewChild } from '@angular/core';
import { AnimationService } from 'src/app/services/animation/animation.service';
import { SceneUtilsService } from 'src/app/services/utils/scene.utils.service';
import * as AnimationModel from 'src/app/shared/animation.model';
import THREE = require('three');



@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css']
})
export class TimelineComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() curTime = 0;
  @Input() newFile!: boolean;
  @Input() selChange!: boolean;
  @ViewChild(CdkScrollable) cdkScrollable!: CdkScrollable;

  constructor(public AnimationService: AnimationService, private renderer: Renderer2, public SceneUtilsService: SceneUtilsService) { }
  onCurrentTimeMove = false;
  onTimeLineExpand = true;
  actionMove = false;
  keyframeClick = false;
  actionClick = false;
  startPos = 0;
  itemSize = 26;
  center!: THREE.Vector3;
  point!: THREE.Object3D;
  offsets: any[] = [];
  contextMenu = false;
  posX = 0;
  posY = 0;
  contextObject: any;
  contextMenuType = "";
  contextKeyframe = false;

  ngOnInit(): void {
  }
  ngAfterViewInit(): void {
    this.SceneUtilsService.angRenderer = this.renderer;
    const ro = new ResizeObserver(entries => {
      for (let entry of entries) {
        const height = entry.contentBoxSize ? entry.contentBoxSize[0].blockSize : entry.contentRect.height;
        let curTime = document.getElementById("curTime")!;
        curTime.style.height = `${height}px`;
      }
    })
    let ln = document.getElementById("lines")!;
    ro.observe(ln);
  }
  ngOnChanges(changes: SimpleChanges): void {
    //console.log(changes)
    if (changes["newFile"] != undefined) {
      console.log(changes["newFile"]);
      if (!changes["newFile"].firstChange)
        if (changes["newFile"].currentValue == this.SceneUtilsService.newFileLoading) {
          this.CreateTreeView();
        }
    }
    if (changes["selChange"] != undefined) {
      if (!changes["selChange"].firstChange) {
        if (this.SceneUtilsService.selected.length != 0) {
          let id = this.AnimationService.timeLine.array!.findIndex(item => item.name == this.SceneUtilsService.selected[0].name);
          if (id != undefined)
            this.ScrollTo(id);
        }
      }
    }
    if (changes["curTime"] != undefined) {
      let currentTime = document.getElementById("curTime")!;
      this.renderer.setStyle(currentTime, "left", `${this.AnimationService.currentTime * this.AnimationService.timeLine.scale}px`);
    }
  }

  PrepareForRecord() {
    this.SceneUtilsService.dialogTitle = "Запись анимации";
    this.SceneUtilsService.dialogType = "record";
    this.SceneUtilsService.dialogShow = true;
    this.AnimationService.MP4Support = this.AnimationService.recorder.browserSupportsMP4();
    this.AnimationService.GIFSupport = this.AnimationService.recorder.browserSupportsGIF();
  }

  TrackByFunction(index: number) {
    return index;
  }
  SetLineNameStyle(type: string): string {
    return `${type}name`;
  }

  ScrollTo(id: number) {
    let offset = id * this.itemSize - this.cdkScrollable.getElementRef().nativeElement.clientHeight / 2;
    this.cdkScrollable.scrollTo({ behavior: 'smooth', top: offset, left: 0 });
  }

  CreateTreeView() {
    this.AnimationService.id = 0;
    this.AnimationService.CreateTreeViewElements(this.SceneUtilsService.scene);
    this.UpdateTracks();
  }

  OnLineClick(id: number) {
    console.log(id);
    let item = this.AnimationService.timeLine.tracks.find(track => track.id == id)!.object;
    console.log(item);
    this.SceneUtilsService.Select(this.SceneUtilsService.targetArray, item, this.SceneUtilsService.CTRLPressed);
  }
  ShowLine(show: boolean) {
    if (show)
      return { 'content-visibility': 'visible' }
    else return { 'content-visibility': 'hidden' }
  }
  SetLineExpandClass(expand: boolean) {
    if (expand)
      return "expand-first";
    else return "expand-second";
  }
  OnExpandLineClick(track: any) {
    track.children.forEach((i: any) => {
      let item = AnimationModel.FindTrackById(this.AnimationService.timeLine, i);
      this.AnimationService.timeLine.array![item!].show = !this.AnimationService.timeLine.array![item!].show;
      this.OnExpandLineClick(this.AnimationService.timeLine.array![item!]);
    })
    track.expand = !track.expand;
  }
  TrackClick(event: MouseEvent) {
    if (!this.keyframeClick && !this.actionClick) {
      if (!this.SceneUtilsService.CTRLPressed) {
        this.AnimationService.selAction.forEach(item => item.active = false)
        this.AnimationService.selAction = [];
        this.AnimationService.selKeyframe.forEach(item => item.active = false)
        this.AnimationService.selKeyframe = [];
      }
    }
    this.keyframeClick = false;
    this.actionClick = false;
  }
  ShowTrackContextMenu(event: MouseEvent, id: number) {
    event.preventDefault();
    if (this.SceneUtilsService.ContextmenuComponent != undefined)
      this.SceneUtilsService.ContextmenuComponent.component.contextMenu = false;
    this.contextMenuType = "timeline-track";
    this.contextObject = this.AnimationService.timeLine.tracks.find(track => track.id == id)!;
    this.posX = event.clientX - 5;
    this.posY = event.clientY - 5;
    console.log(this.posX, this.posY);
    this.contextMenu = true;
  }
  ShowActionContextMenu(event: MouseEvent, action: AnimationModel.KeyframeActionModel) {
    event.preventDefault();
    if (!this.contextKeyframe) {
      if (this.SceneUtilsService.ContextmenuComponent != undefined)
        this.SceneUtilsService.ContextmenuComponent.component.contextMenu = false;
      this.contextMenuType = "timeline-action";
      this.contextObject = action;
      this.posX = event.clientX - 5;
      this.posY = event.clientY - 5;
      console.log(this.posX, this.posY);
      this.contextMenu = true;
    }
    this.contextKeyframe = false;
  }
  ShowKeyframeContextMenu(event: MouseEvent, keyframe: AnimationModel.KeyframeModel) {
    event.preventDefault();
    this.contextKeyframe = true;
    if (this.SceneUtilsService.ContextmenuComponent != undefined)
      this.SceneUtilsService.ContextmenuComponent.component.contextMenu = false;
    this.contextMenuType = "timeline-keyframe";
    this.contextObject = keyframe;
    this.posX = event.clientX - 5;
    this.posY = event.clientY - 5;
    console.log(this.posX, this.posY);
    this.contextMenu = true;
  }
  ActionClick(action: AnimationModel.KeyframeActionModel) {
    this.actionClick = true;
    // console.log(this.AnimationService.ignore);
    if (!this.AnimationService.ignore) {
      let value = !action.active;
      if (!this.SceneUtilsService.CTRLPressed) {
        this.AnimationService.selAction.forEach(item => item.active = false)
        this.AnimationService.selAction = [];
        // (this.AnimationService.selectedAction as any) = undefined;
      }
      action.active = value;
      if (value) {
        // this.AnimationService.selectedAction = action;
        this.AnimationService.selAction.push(action);
      }
      else {
        let i = this.AnimationService.selAction.findIndex(item => item == action);
        if (i) {
          this.AnimationService.selAction.splice(i, 1);
        }
      }
    }
    if (this.AnimationService.selKeyframe.length == 0)
      this.AnimationService.ignore = false;
  }
  ActionMouseDown(event: MouseEvent, action: AnimationModel.KeyframeActionModel) {
    if (this.SceneUtilsService.SHIFTPressed) {
      this.startPos = event.clientX - action.start * this.AnimationService.timeLine.scale;
      this.actionMove = true;
    }
  }
  ActionMouseMove(event: MouseEvent, action: AnimationModel.KeyframeActionModel) {
    if (this.actionMove) {
      let time = event.clientX - this.startPos;
      if (time >= 0 && time + action.length * this.AnimationService.timeLine.scale <= this.AnimationService.timeLine.duration * this.AnimationService.timeLine.scale) {
        let offset = time / this.AnimationService.timeLine.scale - action.start;
        action.track?.shift(offset);
        action.keyframes[0].clip.resetDuration();
        action.start = time / this.AnimationService.timeLine.scale;
        action.keyframes.forEach(keyframe => {
          keyframe.time += offset;
        })
      }
    }
  }
  ActionMouseUp(event: MouseEvent) {
    this.actionMove = false;
  }
  KeyframeClick(keyframe: AnimationModel.KeyframeModel) {
    this.keyframeClick = true;
    let value = !keyframe.active;
    if (!this.SceneUtilsService.CTRLPressed) {
      this.AnimationService.selKeyframe.forEach(item => item.active = false)
      this.AnimationService.selKeyframe = [];
      // (this.AnimationService.selectedKeyframe as any) = undefined;
    }
    keyframe.active = value;
    if (value) {
      this.AnimationService.selKeyframe.push(keyframe);
      this.AnimationService.ignore = true;
      // this.AnimationService.selectedKeyframe = keyframe;
      this.SceneUtilsService.Select(this.SceneUtilsService.targetArray, keyframe.action.trackDOM.object, false);
      this.AnimationService.currentTime = keyframe.time;
      this.AnimationService.currentTimeChange = true;
    }
    else {
      let i = this.AnimationService.selKeyframe.findIndex(item => item == keyframe);
      if (i) {
        this.AnimationService.selKeyframe.splice(i, 1);
        this.AnimationService.ignore = true;
      }
    }
  }
  UpdateTracks() {
    AnimationModel.GetArrayTimeLine(this.AnimationService.timeLine);
    console.log(this.AnimationService.timeLine);
  }
  //UI
  OnTimelineExpand(event: MouseEvent) {
    let container = document.getElementById("timeline-container");
    if (this.onTimeLineExpand) {
      this.renderer.removeClass(event.target, "expand-first");
      this.renderer.addClass(event.target, "expand-second");
      container!.style.height = "34px";
      this.onTimeLineExpand = false;
    }
    else {
      this.renderer.removeClass(event.target, "expand-second");
      this.renderer.addClass(event.target, "expand-first");
      container!.style.height = "30%";
      this.onTimeLineExpand = true;
    }
  }
  OnStopClick($event: MouseEvent) {
    this.AnimationService.stop = true;
    console.log(this.AnimationService.stop);
  }
  OnPlayClick($event: MouseEvent) {
    if (this.AnimationService.play)
      this.AnimationService.play = false;
    else this.AnimationService.play = true;
    console.log(this.AnimationService.play, this.AnimationService.stop);
  }
  SetTrackStyle() {
    return { 'width': `${this.AnimationService.timeLine.duration * this.AnimationService.timeLine.scale}px` };
  }
  SetActionStyle(action: AnimationModel.KeyframeActionModel) {
    let res = {
      'width': `${action.length * this.AnimationService.timeLine.scale}px`,
      'left': `${action.start * this.AnimationService.timeLine.scale}px`,
      'background': 'darkgoldenrod'
    };
    if (action.active)
      res.background = 'springgreen';
    return res;
  }
  SetKeyframeStyle(keyframe: AnimationModel.KeyframeModel) {
    let res = {
      'left': `${(keyframe.time - keyframe.action.start) * this.AnimationService.timeLine.scale}px`,
      'visibility': 'hidden',
      'background': 'tan'
    };
    if (keyframe.action.active) {
      res.visibility = 'visible';
    }
    if (keyframe.active)
      res.background = 'lime';
    return res;
  }
  OnCurrentTimeMouseUp(event: MouseEvent) {
    this.AnimationService.currentTimeChange = false;
    this.onCurrentTimeMove = false;
  }
  OnCurrentTimeMouseMove(event: MouseEvent) {
    if (this.onCurrentTimeMove) {
      this.AnimationService.currentTimeChange = true;
      let curTime = document.getElementById("curTime")!;
      let time = event.clientX - this.startPos;
      if (time >= 0 && time <= this.AnimationService.timeLine.duration * this.AnimationService.timeLine.scale) {
        curTime.style.left = `${time}px`;
        this.AnimationService.currentTime = time / this.AnimationService.timeLine.scale;
      }
    }
  }
  OnCurrentTimeMouseDown(event: MouseEvent) {
    this.onCurrentTimeMove = true;
    this.AnimationService.currentTimeChange = true;
    this.startPos = event.clientX - this.AnimationService.currentTime * this.AnimationService.timeLine.scale;
  }
}

