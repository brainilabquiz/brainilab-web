"""Render the reviewed Number Route worksheet; source examples are separate from Daily."""
import json
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics import renderPDF

ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'content/releases/discovery-20260929.json').read_text(encoding='utf-8'))['worksheet']
DEST=ROOT/'assets/resources/five-number-puzzles.pdf';DEST.parent.mkdir(exist_ok=True)
pdfmetrics.registerFont(TTFont('Body','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Bold','C:/Windows/Fonts/arialbd.ttf'))
W,H=595.28,841.89;navy=HexColor('#2d296e');grey=HexColor('#575461');green=HexColor('#2f6f27')
c=canvas.Canvas(str(DEST),pagesize=(W,H),pageCompression=1)
c.setTitle('5 number puzzles for a coffee break | BrainiLab');c.setAuthor('BrainiLab');c.setSubject('Number Route worksheet with worked solutions')
def text(x,y,s,size=11,font='Body',color=navy):
    c.setFillColor(color);c.setFont(font,size);c.drawString(x,y,s)
def heading(page,title,sub):
    c.setFillColor(navy);c.rect(0,H-9,W,9,fill=1,stroke=0)
    c.drawImage(str(ROOT/'assets/brand/brainilab-logo.png'),40,H-75,width=119,height=40.5,mask='auto')
    text(425,H-49,f'PUZZLE BREAK / {page}',9,'Bold')
    text(40,H-111,title,25,'Bold');text(40,H-134,sub,11,color=grey)
def footer(page):
    c.setStrokeColor(HexColor('#ded9cc'));c.line(40,45,W-40,45)
    text(40,29,'BrainiLab · Free to print and share for personal use, classes and puzzle groups.',8,color=grey)
    text(W-53,29,str(page),8,color=grey)
heading(1,'5 puzzles for a coffee break','Four numbers, three missing signs and one target. Take your time.')
text(40,H-160,'Use +, −, × or ÷. Keep the numbers in order. Work left to right.',10.5,'Bold')
text(40,H-177,'Operators may repeat. Every division must give a whole number.',10.5,color=grey)
for i,r in enumerate(rows):
    y=H-212-i*91
    text(40,y,f'0{i+1}',12,'Bold',green)
    for j,n in enumerate(r['numbers']):
        x=82+j*91
        c.setFillColor(HexColor('#f5f3fa'));c.roundRect(x,y-27,44,45,8,fill=1,stroke=0)
        text(x+14,y-11,str(n),23,'Bold')
        if j<3:
            c.setStrokeColor(HexColor('#797287'));c.roundRect(x+56,y-16,23,24,3,fill=0,stroke=1)
    text(456,y+3,'TARGET',8,'Bold',grey);text(456,y-23,str(r['target']),24,'Bold')
    c.setStrokeColor(HexColor('#d8d4df'));c.line(82,y-42,420,y-42)
text(40,130,'Keep the answers on the next page out of sight.',10,'Bold')
text(40,110,'Ready for another set? Play free at',10,color=grey)
text(40,93,'brainilabgames.com/games/number-route/',10,'Bold')
url='https://brainilabgames.com/games/number-route/?from=number-break'
c.linkURL(url,(40,85,370,125),relative=0,thickness=0)
qr=QrCodeWidget(url);bounds=qr.getBounds();d=Drawing(68,68,transform=[68/(bounds[2]-bounds[0]),0,0,68/(bounds[3]-bounds[1]),0,0]);d.add(qr);renderPDF.draw(d,c,465,74)
footer(1);c.showPage()
heading(2,'The routes, step by step','The running total is the key. Each route has exactly one valid solution.')
text(40,H-160,'Number Route uses a game-specific left-to-right rule.',10.5,'Bold')
text(40,H-177,'For ordinary arithmetic, use the usual order of operations.',10.5,color=grey)
for i,r in enumerate(rows):
    y=H-215-i*92;v=r['numbers'][0];steps=[]
    for op,b in zip(r['solution'],r['numbers'][1:]):
        before=v
        if op=='+':v+=b
        elif op=='−':v-=b
        elif op=='×':v*=b
        else:assert v%b==0;v//=b
        steps.append(f'{before} {op} {b} = {v}')
    assert v==r['target']
    text(40,y,f'0{i+1}',12,'Bold',green)
    text(82,y,', '.join(map(str,r['numbers']))+f'  →  {r["target"]}',16,'Bold')
    text(82,y-25,'   then   '.join(steps),12)
    text(82,y-46,'Signs: '+', '.join(r['solution']),10,color=grey)
text(40,128,'A useful way to get unstuck',13,'Bold')
text(40,108,'Look at the last number. Which total would you need just before it?',10.5,color=grey)
text(40,90,'Then test a route forwards. Keep every number in its original place.',10.5,color=grey)
footer(2);c.save()
print(str(DEST))
