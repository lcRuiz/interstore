import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/** Descripción del producto con formato HTML. */
@Component({
  selector: 'app-product-description',
  template: `<div class="description" [innerHTML]="safeHtml()"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDescription {
  private readonly sanitizer = inject(DomSanitizer);
  /** HTML de la descripción tal como llega de la API. */
  readonly html = input.required<string>();
  protected readonly safeHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.html()));
}
