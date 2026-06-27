Write-Output "Initializing Git repository..."
if (Get-Command git -ErrorAction SilentlyContinue) {
    git init
    git remote add origin https://github.com/arielbulacio-coder/malvinas.git
    git add .
    git commit -m "Initial commit of Malvinas standalone project"
    Write-Output "Git repository initialized and committed locally!"
    Write-Output "To push the code to your repository, run:"
    Write-Output "  git branch -M main"
    Write-Output "  git push -u origin main"
} else {
    Write-Warning "Git is not installed on this system or not in the PATH."
    Write-Output "Once you install Git, you can initialize the repository manually by running:"
    Write-Output "  git init"
    Write-Output "  git remote add origin https://github.com/arielbulacio-coder/malvinas.git"
    Write-Output "  git add ."
    Write-Output "  git commit -m 'Initial commit of Malvinas standalone project'"
    Write-Output "  git branch -M main"
    Write-Output "  git push -u origin main"
}
