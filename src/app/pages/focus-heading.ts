import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

/** Moves focus to the page heading on load so keyboard and screen-reader users know the page changed. */
@Directive({ selector: '[appFocusOnLoad]' })
export class FocusOnLoad implements AfterViewInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  ngAfterViewInit() {
    this.el.nativeElement.focus();
  }
}
