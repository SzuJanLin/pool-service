import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class SettingsPage {
  private readonly newCompanyMenu: Locator;
  private readonly newCompanyNameInput: Locator;
  private readonly createCompanyDialogButton: Locator;
  private readonly removeCompanyButton: Locator;
  private readonly removeCompanyConfirmPrompt: Locator;
  private readonly updateCompanySuccessMessage: string;
  private readonly createCompanySuccessMessage: string;
  private readonly removeCompanySuccessMessage: string;
  private readonly deleteButton: Locator;

  constructor(
    public readonly page: Page,
    public readonly username: string
  ) {
    this.newCompanyMenu = this.page.getByRole('link', { name: 'New Company' });
    this.newCompanyNameInput = this.page.getByPlaceholder('Company Name');
    this.createCompanyDialogButton = this.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create Company' });
    this.removeCompanyButton = this.page.getByRole('button', {
      name: 'Remove Company',
    });
    this.removeCompanyConfirmPrompt = this.page.getByText(
      `Are you sure you want to delete the company? Deleting the company will delete all resources and data associated with the company forever.`
    );
    this.updateCompanySuccessMessage = 'Changes saved successfully.';
    this.createCompanySuccessMessage = 'Company created successfully.';
    this.removeCompanySuccessMessage = 'Company removed successfully.';

    this.deleteButton = page.getByRole('button', { name: 'Delete' });
  }

  async logout() {
    await this.page
      .locator('button')
      .filter({ hasText: this.username })
      .click();
    await this.page.getByRole('button', { name: 'Sign out' }).click();
    await expect(
      this.page.getByRole('heading', { name: 'Welcome back' })
    ).toBeVisible();
  }

  async isLoggedIn() {
    await this.page.waitForSelector('text=All Products');
  }

  async isSettingsPageVisible() {
    await expect(
      this.page.getByRole('heading', { name: 'Company Settings' })
    ).toBeVisible();
  }

  async fillCompanyName(companyName: string) {
    await this.page.locator('input[name="name"]').fill(companyName);
  }

  async isSaveButtonDisabled() {
    await expect(
      this.page.getByRole('button', { name: 'Save Changes' })
    ).toBeDisabled();
  }

  async isCompanyNameLengthErrorVisible() {
    await expect(
      await this.page.getByText('Company name should have at most 50 characters')
    ).toBeVisible();
  }

  async isCompanySlugLengthErrorVisible() {
    await expect(
      await this.page.getByText('Slug should have at most 50 characters')
    ).toBeVisible();
  }

  async isDomainLengthErrorVisible() {
    await expect(
      await this.page.getByText('Domain should have at most 253 characters')
    ).toBeVisible();
  }

  async isDomainInvalidErrorVisible() {
    await expect(
      await this.page.getByText('Enter a domain name in the format example.com')
    ).toBeVisible();
  }

  async clickSaveButton() {
    await this.page.getByRole('button', { name: 'Save Changes' }).click();
  }

  async updateCompanyName(newCompanyName: string) {
    await this.fillCompanyName(newCompanyName);
    await this.clickSaveButton();
    await expect(
      this.page
        .getByRole('status')
        .and(this.page.getByText(this.updateCompanySuccessMessage))
    ).toBeVisible();
  }

  async fillCompanySlug(companySlug: string) {
    await this.page.locator('input[name="slug"]').fill(companySlug);
  }

  async updateCompanySlug(newCompanySlug: string) {
    await this.fillCompanySlug(newCompanySlug);
    await this.clickSaveButton();
    await expect(
      this.page
        .getByRole('status')
        .and(this.page.getByText(this.updateCompanySuccessMessage))
    ).toBeVisible();
  }

  async fillDomain(domain: string) {
    await this.page.locator('input[name="domain"]').fill(domain);
  }

  async updateDomain(domain: string) {
    await this.fillDomain(domain);
    await this.clickSaveButton();
    await expect(
      this.page
        .getByRole('status')
        .and(this.page.getByText(this.updateCompanySuccessMessage))
    ).toBeVisible();
  }

  async checkCompanyName(companyName: string) {
    await expect(this.page.locator('input[name="name"]')).toHaveValue(companyName);
  }

  async checkCompanySlug(companySlug: string) {
    await expect(this.page.locator('input[name="slug"]')).toHaveValue(companySlug);
  }

  async checkDomain(domain: string) {
    await expect(this.page.locator('input[name="domain"]')).toHaveValue(domain);
  }

  async createNewCompany(companyName: string) {
    await this.page.getByText('Example').first().click();
    await this.newCompanyMenu.click();
    await expect(
      this.page.getByRole('heading', { name: 'Create Company' })
    ).toBeVisible();
    await this.newCompanyNameInput.fill(companyName);
    await this.createCompanyDialogButton.click();
    await expect(
      this.page
        .getByRole('status')
        .and(this.page.getByText(this.createCompanySuccessMessage))
    ).toBeVisible();
  }

  async removeCompany(companySlug: string) {
    this.goto(companySlug);
    this.removeCompanyButton.click();
    await expect(this.removeCompanyConfirmPrompt).toBeVisible();
    this.deleteButton.click();
    await expect(
      this.page
        .getByRole('status')
        .and(this.page.getByText(this.removeCompanySuccessMessage))
    ).toBeVisible();
  }

  async gotoSection(pageName: 'security' | 'api-keys') {
    await this.page.goto(`/settings/${pageName}`);
    await this.page.waitForURL(`/settings/${pageName}`);
  }

  async goto(companySlug?: string) {
    await this.page.goto(`/companies/${companySlug}/settings`);
    await this.page.waitForURL(`/companies/${companySlug}/settings`);
  }
}
